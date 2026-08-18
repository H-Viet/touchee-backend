import { IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({
    example: 'b3a8c2d1-...',
    description: 'ID of the community to post in',
  })
  @IsUUID()
  declare communityId: string;

  @ApiProperty({
    example: 'Has anyone else found journaling helpful for anxiety?',
    description: 'Post content, max 2000 characters',
  })
  @IsString()
  @MaxLength(2000)
  declare content: string;
}
