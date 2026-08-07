import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsUUID()
  declare communityId: string;

  @IsString()
  @MaxLength(2000)
  declare content: string;
}
