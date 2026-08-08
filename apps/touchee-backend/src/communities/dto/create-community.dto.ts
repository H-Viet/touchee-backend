import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCommunityDto {
  @IsUUID()
  declare categoryId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  declare name: string;

  @IsString()
  @MaxLength(500)
  declare description: string;
}
