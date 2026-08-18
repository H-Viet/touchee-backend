import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFriendRequestDto {
  @ApiPropertyOptional({
    example: 'c144bf7e-...',
    description:
      'Optional — the match that prompted this request. Omit entirely to send a general friend request.',
  })
  @IsOptional()
  @IsUUID()
  // matchId that prompted this request
  declare matchId?: string;
}
