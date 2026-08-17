import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRatingDto {
  @IsString()
  declare ratingTypeCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string; // optional note about the match
}
