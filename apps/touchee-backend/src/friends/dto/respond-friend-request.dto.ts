import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondFriendRequestDto {
  @ApiProperty({
    example: 'ACCEPTED',
    enum: ['ACCEPTED', 'DECLINED'],
    description: 'Your response to the friend request',
  })
  @IsIn(['ACCEPTED', 'DECLINED'])
  declare status: 'ACCEPTED' | 'DECLINED';
}
