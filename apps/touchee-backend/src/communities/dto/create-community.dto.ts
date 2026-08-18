import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommunityDto {
  @ApiProperty({
    example: 'b3a8c2d1-...',
    description: 'ID of the category this community belongs to',
  })
  @IsUUID()
  declare categoryId: string;

  @ApiProperty({
    example: 'Late Night Thoughts',
    description: 'Community name, 3–50 characters',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  declare name: string;

  @ApiProperty({
    example: "A space for when your mind won't stop at 2am",
    description: 'Short description, max 500 characters',
  })
  @IsString()
  @MaxLength(500)
  declare description: string;
}
