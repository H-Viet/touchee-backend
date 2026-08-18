import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditMessageDto {
  @ApiProperty({
    example: 'Hey, how are you feeling today? (edited)',
    description: 'New message content, 1–2000 characters',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  declare content: string;
}
