import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    example: 'b3a8c2d1-...',
    description: 'ID of the chat to send the message to',
  })
  @IsUUID()
  declare chatId: string;

  @ApiProperty({
    example: 'Hey, how are you feeling today?',
    description: 'Message content, 1–2000 characters',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  declare content: string;
}
