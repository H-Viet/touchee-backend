import { Module } from '@nestjs/common';
// import { CommonService } from './common.service';
import { RedisService } from './redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class CommonModule {}
