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
import { RedisService } from '@app/common';

@WebSocketGateway({
  cors: { origin: '*' }, // allow all origins in dev
  namespace: '/matching', // separate namespace from default
})
export class MatchingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MatchingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  // Fires when a client connects via WebSocket
  async handleConnection(socket: Socket) {
    try {
      // Extract JWT from the socket handshake
      // Client must send: io('/matching', { auth: { token: 'Bearer eyJ...' } })
      const token = socket.handshake.auth?.token?.replace('Bearer ', '');
      if (!token) {
        this.logger.warn(
          `Socket ${socket.id} connected without token — disconnecting`,
        );
        socket.disconnect();
        return;
      }

      // Verify the token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Store userId on the socket object for later use
      socket.data.userId = userId;

      // Map userId → socketId in Redis so MatchingService can find this socket
      await this.redisService.setUserSocket(userId, socket.id);

      this.logger.log(
        `User ${userId} connected via WebSocket (socket: ${socket.id})`,
      );
    } catch (err) {
      this.logger.warn(`Invalid token on socket ${socket.id} — disconnecting`);
      socket.disconnect();
    }
  }

  // Fires when a client disconnects
  async handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;
    if (userId) {
      await this.redisService.removeUserSocket(userId);
      this.logger.log(`User ${userId} disconnected (socket: ${socket.id})`);
    }
  }

  // Client sends "heartbeat" event every 30s to stay in the pool
  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { moodCode: string },
  ) {
    const userId = socket.data.userId;
    if (userId && data?.moodCode) {
      await this.redisService.refreshHeartbeat(data.moodCode, userId);
    }
  }

  // Push a "matched" event to a specific user by their userId
  // Called by MatchingService when a match is found
  async notifyMatched(
    userId: string,
    matchData: {
      matchId: string;
      chatId: string;
      partnerId: string;
      partnerUsername: string;
      moodTag: string;
    },
  ) {
    const socketId = await this.redisService.getUserSocket(userId);
    if (socketId) {
      this.server.to(socketId).emit('matched', matchData);
      this.logger.log(`Notified user ${userId} of match ${matchData.matchId}`);
    }
  }

  // Push a "matchEnded" event to a specific user
  async notifyMatchEnded(userId: string, matchId: string) {
    const socketId = await this.redisService.getUserSocket(userId);
    if (socketId) {
      this.server.to(socketId).emit('matchEnded', { matchId });
    }
  }
}
