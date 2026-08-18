import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoteCommentDto {
  @ApiProperty({
    example: 'UP',
    enum: ['UP', 'DOWN'],
    description: 'Vote direction',
  })
  @IsIn(['UP', 'DOWN'])
  declare value: 'UP' | 'DOWN';
}
