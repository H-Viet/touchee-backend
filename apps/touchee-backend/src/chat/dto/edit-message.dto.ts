import { IsString, MaxLength, MinLength } from 'class-validator';

export class EditMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  declare content: string;
}
