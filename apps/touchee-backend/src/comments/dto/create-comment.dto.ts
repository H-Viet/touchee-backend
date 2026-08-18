import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    example: 'This really resonated with me, thank you for sharing',
    description: 'Comment content, 1–1000 characters',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  declare content: string;
}
