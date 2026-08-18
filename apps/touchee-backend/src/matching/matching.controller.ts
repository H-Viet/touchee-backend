import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { MatchingService } from './matching.service';
import { JoinMatchDto } from './dto/join-match.dto';

@ApiTags('Matching')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  // Join the matching pool for a specific mood
  @ApiOperation({
    summary:
      'Join the matching pool for a mood — triggers immediate match attempt if another user is waiting',
  })
  @ApiResponse({
    status: 201,
    description:
      'Joined pool — listen for "matched" event on WebSocket /matching namespace',
  })
  @ApiResponse({
    status: 400,
    description: 'Already in a pool or has an active match',
  })
  @ApiResponse({ status: 404, description: 'Mood tag not found' })
  @Post('join')
  join(@CurrentUser() user: { userId: string }, @Body() dto: JoinMatchDto) {
    return this.matchingService.joinPool(user.userId, dto.moodCode);
  }

  // Leave the matching pool
  @ApiOperation({ summary: 'Leave the matching pool without being matched' })
  @ApiResponse({ status: 200, description: 'Left pool successfully' })
  @Delete('leave/:moodCode')
  leave(
    @CurrentUser() user: { userId: string },
    @Param('moodCode') moodCode: string,
  ) {
    return this.matchingService.leavePool(user.userId, moodCode);
  }

  // Get your current active match
  @ApiOperation({ summary: 'Get your current active match' })
  @ApiResponse({
    status: 200,
    description: 'Returns active match or null if none',
  })
  @Get('active')
  getActive(@CurrentUser() user: { userId: string }) {
    return this.matchingService.getActiveMatch(user.userId);
  }

  // Get all mood tags
  @ApiOperation({ summary: 'Get all available mood tags for matching' })
  @ApiResponse({ status: 200, description: 'Returns list of mood tags' })
  @Get('moods')
  getMoods() {
    return this.matchingService.getMoods();
  }

  // End an active match
  @ApiOperation({
    summary:
      'End an active match — creates a 24hr re-match exclusion and notifies partner',
  })
  @ApiResponse({
    status: 201,
    description: 'Match ended — partner notified via WebSocket',
  })
  @ApiResponse({
    status: 400,
    description: 'Not part of this match or match already ended',
  })
  @Post(':id/end')
  endMatch(
    @CurrentUser() user: { userId: string },
    @Param('id') matchId: string,
  ) {
    return this.matchingService.endMatch(user.userId, matchId);
  }

  // Get matching history
  @ApiOperation({ summary: 'Get your match history (paginated)' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns past matches newest first',
  })
  @Get('history')
  getHistory(
    @CurrentUser() user: { userId: string },
    @Query('cursor') cursor?: string,
  ) {
    return this.matchingService.getHistory(user.userId, cursor);
  }
}
