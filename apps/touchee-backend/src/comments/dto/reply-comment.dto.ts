import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReplyCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  declare content: string;
}
