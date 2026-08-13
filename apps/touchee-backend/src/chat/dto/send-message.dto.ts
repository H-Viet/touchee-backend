import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  declare chatId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  declare content: string;
}
