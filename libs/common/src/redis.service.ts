import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  declare private client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(this.config.get<string>('REDIS_URL')!);

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ─── Pool management ──────────────────────────────────────────────────────

  // Add a user to a mood pool with a TTL (heartbeat)
  // TTL = 60 seconds — if the user closes the app, their entry auto-expires
  async joinPool(moodCode: string, userId: string): Promise<void> {
    // SADD = "Set ADD" — Redis Sets are perfect for pools:
    // - no duplicates (joining twice = still one entry)
    // - O(1) add/remove/check
    await this.client.sadd(`pool:${moodCode}`, userId);

    // Separate TTL key per user — their "heartbeat"
    // If the frontend doesn't refresh this, user gets auto-removed after 60s
    await this.client.setex(`pool:${moodCode}:${userId}`, 60, '1');
  }

  // Remove a user from a mood pool
  async leavePool(moodCode: string, userId: string): Promise<void> {
    await this.client.srem(`pool:${moodCode}`, userId);
    await this.client.del(`pool:${moodCode}:${userId}`);
  }

  // Get ALL users currently in a pool
  async getPoolMembers(moodCode: string): Promise<string[]> {
    return this.client.smembers(`pool:${moodCode}`);
  }

  // Check if a specific user is still "alive" in the pool (heartbeat check)
  async isUserInPool(moodCode: string, userId: string): Promise<boolean> {
    const alive = await this.client.exists(`pool:${moodCode}:${userId}`);
    return alive === 1;
  }

  // Refresh a user's TTL — frontend calls this every 30s to say "still here"
  async refreshHeartbeat(moodCode: string, userId: string): Promise<void> {
    await this.client.setex(`pool:${moodCode}:${userId}`, 60, '1');
  }

  // ─── Match state ──────────────────────────────────────────────────────────

  // Store which socket is connected to which userId
  // Needed so we can push "you've been matched!" to the right socket
  async setUserSocket(userId: string, socketId: string): Promise<void> {
    await this.client.setex(`socket:${userId}`, 3600, socketId);
  }

  async getUserSocket(userId: string): Promise<string | null> {
    return this.client.get(`socket:${userId}`);
  }

  async removeUserSocket(userId: string): Promise<void> {
    await this.client.del(`socket:${userId}`);
  }

  // ─── Generic helpers (useful for later phases too) ────────────────────────

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
