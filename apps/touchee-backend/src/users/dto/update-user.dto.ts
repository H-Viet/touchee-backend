import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Harry Dev',
    description: 'Display name, max 50 characters',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fullname?: string;

  @ApiPropertyOptional({
    example: 'Building Touchee one endpoint at a time',
    description: 'Short bio, max 160 characters',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.touchee.app/avatars/harry.jpg',
    description: 'URL to avatar image',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: 'Ho Chi Minh City',
    description: 'User location',
  })
  @IsOptional()
  @IsString()
  location?: string;
}
