import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { FriendsService } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('users/:id/friend-request')
  sendRequest(
    @CurrentUser() user: { userId: string },
    @Param('id') receiverId: string,
    @Body() dto: CreateFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(
      user.userId,
      receiverId,
      dto.matchId,
    );
  }

  @Get('friend-requests')
  getPending(@CurrentUser() user: { userId: string }) {
    return this.friendsService.getPendingRequests(user.userId);
  }

  @Patch('friend-requests/:id')
  respond(
    @CurrentUser() user: { userId: string },
    @Param('id') requestId: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendsService.respond(user.userId, requestId, dto);
  }

  @Get('friends')
  getFriends(@CurrentUser() user: { userId: string }) {
    return this.friendsService.getFriends(user.userId);
  }

  @Delete('friends/:id')
  removeFriend(
    @CurrentUser() user: { userId: string },
    @Param('id') friendId: string,
  ) {
    return this.friendsService.removeFriend(user.userId, friendId);
  }
}
