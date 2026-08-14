import { IsIn } from 'class-validator';

export class RespondFriendRequestDto {
  @IsIn(['ACCEPTED', 'DECLINED'])
  declare status: 'ACCEPTED' | 'DECLINED';
}
