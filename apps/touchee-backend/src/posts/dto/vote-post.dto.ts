import { IsIn } from 'class-validator';

export class VotePostDto {
  @IsIn(['UP', 'DOWN'])
  declare value: 'UP' | 'DOWN';
}
