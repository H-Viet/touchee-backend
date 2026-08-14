import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { RedisService } from '@app/common';
import { MatchingGateway } from './matching.gateway';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: MatchingGateway,
    private readonly chatGateway: ChatGateway,
  ) {}

  async getMoods() {
    return this.prisma.moodTag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async joinPool(userId: string, moodCode: string) {
    // Confirm the mood tag actually exists
    const moodTag = await this.prisma.moodTag.findUnique({
      where: { code: moodCode },
    });
    if (!moodTag) {
      throw new NotFoundException(`Mood tag "${moodCode}" not found`);
    }

    // Check if user already has an active match
    const activeMatch = await this.prisma.match.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });
    if (activeMatch) {
      throw new BadRequestException(
        'You already have an active match — end it before joining a new pool',
      );
    }

    // Check if user has already waiting in any pool
    const allMoodTags = await this.prisma.moodTag.findMany();
    for (const tag of allMoodTags) {
      const alreadyInPool = await this.redis.isUserInPool(tag.code, userId);
      if (alreadyInPool) {
        throw new BadRequestException(
          `You are already waiting in the "${tag.name}" pool — leave it first before joining another`,
        );
      }
    }

    // Add to Redis pool
    await this.redis.joinPool(moodCode, userId);
    this.logger.log(`User ${userId} joined pool: ${moodCode}`);

    // Try to find a match immediately
    await this.tryMatch(userId, moodCode, moodTag.id);

    return { message: 'Joined matching pool', moodCode };
  }

  async leavePool(userId: string, moodCode: string) {
    await this.redis.leavePool(moodCode, userId);
    this.logger.log(`User ${userId} left pool: ${moodCode}`);
    return { message: 'Left matching pool' };
  }

  async endMatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match not found');

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new BadRequestException('You are not part of this match');
    }

    if (match.status === 'ENDED') {
      throw new BadRequestException('Match already ended');
    }

    // Update match status in Postgres
    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'ENDED', endedAt: new Date() },
    });

    // Create a RECENT_MATCH exclusion so they won't be matched again for 24hrs
    const partnerId = match.userAId === userId ? match.userBId : match.userAId;
    await this.prisma.matchExclusion.create({
      data: {
        userAId: userId,
        userBId: partnerId,
        reason: 'RECENT_MATCH',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Notify the partner that the match ended
    await this.gateway.notifyMatchEnded(partnerId, matchId);

    return updated;
  }

  async getActiveMatch(userId: string) {
    return this.prisma.match.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        moodTag: true,
        chat: true,
        userA: {
          select: { id: true, username: true, avatarUrl: true },
        },
        userB: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
  }

  async getHistory(userId: string, cursor?: string, take = 20) {
    return this.prisma.match.findMany({
      take,
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { startedAt: 'desc' },
      include: {
        moodTag: {
          select: { code: true, name: true },
        },
        userA: {
          select: { id: true, username: true, avatarUrl: true },
        },
        userB: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
  }

  // ─── Core matching logic ──────────────────────────────────────────────────

  private async tryMatch(userId: string, moodCode: string, moodTagId: string) {
    // Get everyone currently in the pool
    const poolMembers = await this.redis.getPoolMembers(moodCode);

    // Filter out the current user
    const candidates = poolMembers.filter((id) => id !== userId);

    if (candidates.length === 0) {
      this.logger.log(`No candidates in pool ${moodCode} for user ${userId}`);
      return;
    }

    // Find first eligible candidate (not excluded, heartbeat alive)
    for (const candidateId of candidates) {
      // Check if candidate's heartbeat is still alive
      const isAlive = await this.redis.isUserInPool(moodCode, candidateId);
      if (!isAlive) {
        // Clean up stale entry
        await this.redis.leavePool(moodCode, candidateId);
        continue;
      }

      // Check MatchExclusion table — should we ever match these two?
      const excluded = await this.isExcluded(userId, candidateId);
      if (excluded) {
        this.logger.log(`Skipping excluded pair: ${userId} <-> ${candidateId}`);
        continue;
      }

      // Found a valid match!
      await this.createMatch(userId, candidateId, moodTagId, moodCode);
      return;
    }

    this.logger.log(
      `No eligible match found for user ${userId} in pool ${moodCode}`,
    );
  }

  private async isExcluded(userAId: string, userBId: string): Promise<boolean> {
    const exclusion = await this.prisma.matchExclusion.findFirst({
      where: {
        AND: [
          {
            OR: [
              { userAId, userBId },
              { userAId: userBId, userBId: userAId },
            ],
          },
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        ],
      },
    });
    return exclusion !== null;
  }

  private async createMatch(
    userAId: string,
    userBId: string,
    moodTagId: string,
    moodCode: string,
  ) {
    this.logger.log(`Creating match: ${userAId} <-> ${userBId} (${moodCode})`);

    // Create Match + Chat in a single transaction
    const { match, chat, userA, userB } = await this.prisma.$transaction(
      async (tx) => {
        // Create the chat first
        const chat = await tx.chat.create({
          data: { isGroup: false },
        });

        // Create the match linked to the chat
        const match = await tx.match.create({
          data: {
            userAId,
            userBId,
            moodTagId,
            chatId: chat.id,
            status: 'ACTIVE',
          },
        });

        // Add both users to the chat
        await tx.userChat.createMany({
          data: [
            { userId: userAId, chatId: chat.id },
            { userId: userBId, chatId: chat.id },
          ],
        });

        // Fetch user details for the WebSocket notification
        const [userA, userB] = await Promise.all([
          tx.user.findUnique({
            where: { id: userAId },
            select: { id: true, username: true },
          }),
          tx.user.findUnique({
            where: { id: userBId },
            select: { id: true, username: true },
          }),
        ]);

        // Push a system message into the chat so the conversation
        // starts with context — users immediately know why they're connected
        await tx.message.create({
          data: {
            chatId: chat.id,
            senderId: userAId, // system messages attributed to userA for now
            content: `🎯 You've been matched on mood: "${moodCode}". Say hi! 👋`,
            status: 'sent',
          },
        });

        return { match, chat, userA, userB };
      },
    );

    // ─── Everything below runs AFTER the transaction commits ─────────────────
    // Side effects (WebSocket, Redis) only fire once DB is fully committed

    // Remove both users from Redis pool — they're matched now
    await Promise.all([
      this.redis.leavePool(moodCode, userAId),
      this.redis.leavePool(moodCode, userBId),
    ]);

    // Notify both users via WebSocket simultaneously
    await Promise.all([
      this.gateway.notifyMatched(userAId, {
        matchId: match.id,
        chatId: chat.id,
        partnerId: userBId,
        partnerUsername: userB!.username,
        moodTag: moodCode,
      }),
      this.gateway.notifyMatched(userBId, {
        matchId: match.id,
        chatId: chat.id,
        partnerId: userAId,
        partnerUsername: userA!.username,
        moodTag: moodCode,
      }),
    ]);

    // Push system message to chat room via WebSocket
    // Push the system message to both users' chat rooms in real time
    await this.chatGateway.pushToChat(chat.id, 'newMessage', {
      id: null,
      chatId: chat.id,
      content: `🎯 You've been matched on mood: "${moodCode}". Say hi! 👋`,
      sender: { id: 'system', username: 'Touchee' },
      createdAt: new Date(),
      reads: [],
      reactions: [],
    });

    this.logger.log(`Match created: ${match.id}`);
    this.logger.log(`System message pushed to chat room ${chat.id}`);
  }
}
