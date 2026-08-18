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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { FriendsService } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';

@ApiTags('Friends')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @ApiOperation({
    summary: 'Send a friend request to any user — matchId is optional context',
  })
  @ApiResponse({ status: 201, description: 'Friend request sent' })
  @ApiResponse({ status: 400, description: 'Cannot send request to yourself' })
  @ApiResponse({
    status: 409,
    description: 'Already friends or request already pending',
  })
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

  @ApiOperation({ summary: 'List your pending incoming friend requests' })
  @ApiResponse({
    status: 200,
    description: 'Returns pending requests with sender info and match context',
  })
  @Get('friend-requests')
  getPending(@CurrentUser() user: { userId: string }) {
    return this.friendsService.getPendingRequests(user.userId);
  }

  @ApiOperation({
    summary:
      'Accept or decline a friend request — accepting creates a Friend record',
  })
  @ApiResponse({
    status: 200,
    description: 'Request updated — accepted creates a friendship',
  })
  @ApiResponse({ status: 403, description: 'Request was not sent to you' })
  @ApiResponse({ status: 400, description: 'Request already responded to' })
  @Patch('friend-requests/:id')
  respond(
    @CurrentUser() user: { userId: string },
    @Param('id') requestId: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendsService.respond(user.userId, requestId, dto);
  }

  @ApiOperation({ summary: 'List all your friends' })
  @ApiResponse({
    status: 200,
    description:
      'Returns friends with profile info — always returns the other user, not yourself',
  })
  @Get('friends')
  getFriends(@CurrentUser() user: { userId: string }) {
    return this.friendsService.getFriends(user.userId);
  }

  @ApiOperation({ summary: 'Remove a friend' })
  @ApiResponse({ status: 200, description: 'Friendship removed' })
  @ApiResponse({ status: 404, description: 'Friendship not found' })
  @Delete('friends/:id')
  removeFriend(
    @CurrentUser() user: { userId: string },
    @Param('id') friendId: string,
  ) {
    return this.friendsService.removeFriend(user.userId, friendId);
  }
}
