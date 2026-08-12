import { IsString } from 'class-validator';

export class JoinMatchDto {
  @IsString()
  // e.g. "anxious", "lonely", "need_to_vent"
  declare moodCode: string;
}
