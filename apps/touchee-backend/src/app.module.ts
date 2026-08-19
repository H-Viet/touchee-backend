import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { CommunitiesModule } from './communities/communities.module';
import { CommentsModule } from './comments/comments.module';
import { CommonModule } from '@app/common';
import { MatchingModule } from './matching/matching.module';
import { ChatModule } from './chat/chat.module';
import { FriendsModule } from './friends/friends.module';
import { RatingsModule } from './ratings/ratings.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second window
        limit: 10, // max 10 requests per second per IP
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute window
        limit: 100, // max 100 requests per minute per IP
      },
    ]),
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    PostsModule,
    CommunitiesModule,
    CommentsModule,
    MatchingModule,
    ChatModule,
    FriendsModule,
    RatingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      // applies globally to every route
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
