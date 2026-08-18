import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'harry@test.com',
    description: "User's email address",
  })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: 'Harry Nguyen', description: "User's full name" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  declare fullname: string;

  @ApiProperty({
    example: 'harry_dev',
    description: 'Unique username, letters/numbers/underscores only',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username can only contain letters, numbers and underscores',
  })
  declare username: string;

  @ApiProperty({
    example: 'password123',
    description: 'Minimum 8 characters',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  declare password: string;
}
