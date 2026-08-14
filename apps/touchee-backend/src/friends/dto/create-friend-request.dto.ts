import { IsUUID } from 'class-validator';

export class CreateFriendRequestDto {
  @IsUUID()
  // matchId that prompted this request
  declare matchId: string;
}
