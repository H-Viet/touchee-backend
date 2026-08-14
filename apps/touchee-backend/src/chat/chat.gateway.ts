import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat', // separate namespace from /matching
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token?.replace('Bearer ', '');
      if (!token) {
        socket.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      socket.data.userId = payload.sub;
      this.logger.log(`User ${payload.sub} connected to chat`);
    } catch {
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    this.logger.log(`User ${socket.data.userId} disconnected from chat`);
  }

  // ─── Join a chat room ─────────────────────────────────────────────────────
  // Client must join a room to receive messages for that chat
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = socket.data.userId;
    try {
      // Verify membership before allowing room join
      await this.chatService.checkMembership(userId, data.chatId);
      socket.join(data.chatId);
      this.logger.log(`User ${userId} joined chat room ${data.chatId}`);
      socket.emit('joinedChat', { chatId: data.chatId });
    } catch (err) {
      socket.emit('error', { message: 'Not a member of this chat' });
    }
  }

  // ─── Leave a chat room ────────────────────────────────────────────────────
  @SubscribeMessage('leaveChat')
  handleLeaveChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    socket.leave(data.chatId);
    socket.emit('leftChat', { chatId: data.chatId });
  }

  // ─── Send a message ───────────────────────────────────────────────────────
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = socket.data.userId;
    try {
      const message = await this.chatService.sendMessage(userId, dto);

      // Broadcast to everyone in the chat room (including sender)
      this.server.to(dto.chatId).emit('newMessage', message);
    } catch (err: any) {
      socket.emit('error', { message: err.message });
    }
  }

  // ─── Typing indicator ─────────────────────────────────────────────────────
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ) {
    const userId = socket.data.userId;
    // Broadcast to everyone EXCEPT the sender
    socket.to(data.chatId).emit('userTyping', {
      userId,
      chatId: data.chatId,
      isTyping: data.isTyping,
    });
  }

  // ─── Mark messages as read ────────────────────────────────────────────────
  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId: string; messageIds: string[] },
  ) {
    const userId = socket.data.userId;
    try {
      await this.chatService.markRead(userId, data.chatId, data.messageIds);

      // Notify others in the chat that messages were read
      socket.to(data.chatId).emit('messagesRead', {
        userId,
        messageIds: data.messageIds,
        readAt: new Date(),
      });
    } catch (err: any) {
      socket.emit('error', { message: err.message });
    }
  }

  // ─── Edit a message ───────────────────────────────────────────────────────
  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; chatId: string; content: string },
  ) {
    const userId = socket.data.userId;
    try {
      const updated = await this.chatService.editMessage(
        userId,
        data.messageId,
        { content: data.content },
      );
      // Broadcast updated message to everyone in the chat
      this.server.to(data.chatId).emit('messageEdited', updated);
    } catch (err: any) {
      socket.emit('error', { message: err.message });
    }
  }

  // ─── Delete a message ─────────────────────────────────────────────────────
  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; chatId: string },
  ) {
    const userId = socket.data.userId;
    try {
      const result = await this.chatService.deleteMessage(
        userId,
        data.messageId,
      );
      this.server.to(data.chatId).emit('messageDeleted', result);
    } catch (err: any) {
      socket.emit('error', { message: err.message });
    }
  }

  // ─── Called by other services to push notifications into a chat ───────────
  async pushToChat(chatId: string, event: string, data: any) {
    this.server.to(chatId).emit(event, data);
  }
}
