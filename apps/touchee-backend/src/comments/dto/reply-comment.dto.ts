import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyCommentDto {
  @ApiProperty({
    example: "You're not alone in this — it gets better with time",
    description: 'Reply content, 1-1000 characters',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  declare content: string;
}
