import { Global, Module } from '@nestjs/common';
// import { CommonService } from './common.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class CommonModule {}
