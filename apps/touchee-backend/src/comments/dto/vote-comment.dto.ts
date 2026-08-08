import { IsIn } from 'class-validator';

export class VoteCommentDto {
  @IsIn(['UP', 'DOWN'])
  declare value: 'UP' | 'DOWN';
}
