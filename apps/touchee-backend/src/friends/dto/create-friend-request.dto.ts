import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFriendRequestDto {
  @ApiPropertyOptional({
    description: 'Optional — the match that prompted this request',
  })
  @IsOptional()
  @IsUUID()
  // matchId that prompted this request
  declare matchId?: string;
}
