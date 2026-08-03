import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  declare email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  declare fullname: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username can only contain letters, numbers and underscores',
  })
  declare username: string;

  @IsString()
  @MinLength(8)
  declare password: string;
}
