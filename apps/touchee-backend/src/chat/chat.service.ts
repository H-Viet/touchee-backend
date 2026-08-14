import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';

const messageSelect = {
  id: true,
  content: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  sender: {
    select: { id: true, username: true, avatarUrl: true },
  },
  reads: {
    select: { userId: true, readAt: true },
  },
  reactions: {
    select: {
      id: true,
      userId: true,
      reaction: { select: { icon: true, type: true } },
    },
  },
};

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Get all chats for a user ─────────────────────────────────────────────
  async findAll(userId: string) {
    const userChats = await this.prisma.userChat.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, username: true, avatarUrl: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1, // just the last message for preview
              select: {
                id: true,
                content: true,
                createdAt: true,
                sender: {
                  select: { id: true, username: true },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return userChats.map((uc) => uc.chat);
  }

  // ─── Get one chat with recent messages ────────────────────────────────────
  async findOne(userId: string, chatId: string) {
    await this.checkMembership(userId, chatId);

    return this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: messageSelect,
        },
      },
    });
  }

  // ─── Get paginated message history ────────────────────────────────────────
  async getMessages(
    userId: string,
    chatId: string,
    cursor?: string,
    take = 30,
  ) {
    await this.checkMembership(userId, chatId);

    return this.prisma.message.findMany({
      where: { chatId },
      take,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
      select: messageSelect,
    });
  }

  // ─── Send a message ───────────────────────────────────────────────────────
  async sendMessage(senderId: string, dto: SendMessageDto) {
    await this.checkMembership(senderId, dto.chatId);

    const message = await this.prisma.message.create({
      data: {
        chatId: dto.chatId,
        senderId,
        content: dto.content,
      },
      select: messageSelect,
    });

    // Auto mark as read for the sender
    await this.prisma.messageRead.create({
      data: {
        messageId: message.id,
        userId: senderId,
      },
    });

    return message;
  }

  // ─── Edit a message ───────────────────────────────────────────────────────
  async editMessage(userId: string, messageId: string, dto: EditMessageDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Save old content to MessageLog before overwriting
    await this.prisma.messageLog.create({
      data: {
        messageId,
        prevContent: message.content,
      },
    });

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: dto.content, status: 'edited' },
      select: messageSelect,
    });
  }

  // ─── Delete a message ─────────────────────────────────────────────────────
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Soft delete — keep the row but mark as deleted
    // so chat history doesn't have gaps
    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: 'This message was deleted', status: 'deleted' },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  // ─── Mark messages as read ────────────────────────────────────────────────
  async markRead(userId: string, chatId: string, messageIds: string[]) {
    await this.checkMembership(userId, chatId);

    // Upsert read receipts for each message
    await Promise.all(
      messageIds.map((messageId) =>
        this.prisma.messageRead.upsert({
          where: { messageId_userId: { messageId, userId } },
          create: { messageId, userId },
          update: { readAt: new Date() },
        }),
      ),
    );

    return { read: messageIds.length };
  }

  // ─── Helper ───────────────────────────────────────────────────────────────
  async checkMembership(userId: string, chatId: string) {
    const membership = await this.prisma.userChat.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this chat');
    }
    return membership;
  }
}
