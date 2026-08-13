import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchingGateway } from './matching.gateway';

@Module({
  imports: [
    // Gateway needs JwtService to verify tokens on WebSocket connect
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingGateway],
})
export class MatchingModule {}
