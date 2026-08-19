import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';

const userPreview = {
  id: true,
  username: true,
  fullname: true,
  avatarUrl: true,
  accScore: true,
};

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Send a friend request ─────────────────────────────────────────────────
  async sendRequest(senderId: string, receiverId: string, matchId?: string) {
    // Can't add yourself
    if (senderId === receiverId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );
    }

    // Confirm receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) throw new NotFoundException('User not found');

    // matchId is now optional — only validate it if provided
    if (matchId) {
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
      });
      if (!match) throw new NotFoundException('Match not found');
      if (match.userAId !== senderId && match.userBId !== senderId) {
        throw new ForbiddenException('You were not part of this match');
      }
    }

    // Check not already friends
    const alreadyFriends = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userAId: senderId, userBId: receiverId },
          { userAId: receiverId, userBId: senderId },
        ],
      },
    });
    if (alreadyFriends) {
      throw new ConflictException('You are already friends');
    }

    // Check no pending request already exists
    const existing = await this.prisma.friendRequest.findFirst({
      where: { senderId, receiverId, status: 'PENDING' },
    });
    if (existing) {
      throw new ConflictException('Friend request already sent');
    }

    return this.prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
        matchId: matchId ?? null,
        status: 'PENDING',
      },
      include: {
        sender: { select: userPreview },
        receiver: { select: userPreview },
      },
    });
  }

  // ─── List pending incoming requests ───────────────────────────────────────
  async getPendingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: {
        sender: { select: userPreview },
        match: {
          select: {
            id: true,
            moodTag: { select: { name: true } },
            startedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Accept or decline a request ──────────────────────────────────────────
  async respond(
    userId: string,
    requestId: string,
    dto: RespondFriendRequestDto,
  ) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Friend request not found');
    if (request.receiverId !== userId) {
      throw new ForbiddenException('This request was not sent to you');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        'This request has already been responded to',
      );
    }

    // If accepting — create the Friend row in a transaction
    if (dto.status === 'ACCEPTED') {
      return this.prisma.$transaction(async (tx) => {
        await tx.friendRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED' },
        });

        return tx.friend.create({
          data: {
            userAId: request.senderId,
            userBId: request.receiverId,
          },
          include: {
            userA: { select: userPreview },
            userB: { select: userPreview },
          },
        });
      });
    }

    // Declining — just update the status
    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED' },
    });
  }

  // ─── List friends ──────────────────────────────────────────────────────────
  async getFriends(userId: string) {
    const friends = await this.prisma.friend.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: { select: userPreview },
        userB: { select: userPreview },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Return the OTHER user (not the requesting user)
    return friends.map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      friend: f.userAId === userId ? f.userB : f.userA,
    }));
  }

  // ─── Remove a friend ──────────────────────────────────────────────────────
  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: friendId },
          { userAId: friendId, userBId: userId },
        ],
      },
    });
    if (!friendship) throw new NotFoundException('Friendship not found');

    await this.prisma.friend.delete({ where: { id: friendship.id } });
    return { message: 'Friend removed' };
  }
}
