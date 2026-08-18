import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinMatchDto {
  @ApiProperty({
    example: 'anxious',
    description: 'Mood tag code to join the pool for',
    enum: ['anxious', 'lonely', 'need_to_vent', 'overwhelmed'],
  })
  @IsString()
  // e.g. "anxious", "lonely", "need_to_vent"
  declare moodCode: string;
}
