import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRatingDto {
  @ApiProperty({
    example: 'great_listener',
    description:
      'Rating type code — get available codes from GET /ratings/types',
    enum: ['great_listener', 'good_listener', 'okay', 'not_helpful'],
  })
  @IsString()
  declare ratingTypeCode: string;

  @ApiPropertyOptional({
    example: 'Really helped me think things through, very empathetic',
    description: 'Optional note about the match experience, max 500 characters',
  })
  // @IsString()
  // declare ratingTypeCode: string;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string; // optional note about the match
}
