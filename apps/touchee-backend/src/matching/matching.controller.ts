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
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { MatchingService } from './matching.service';
import { JoinMatchDto } from './dto/join-match.dto';

@UseGuards(JwtAuthGuard)
@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  // Join the matching pool for a specific mood
  @Post('join')
  join(@CurrentUser() user: { userId: string }, @Body() dto: JoinMatchDto) {
    return this.matchingService.joinPool(user.userId, dto.moodCode);
  }

  // Leave the matching pool
  @Delete('leave/:moodCode')
  leave(
    @CurrentUser() user: { userId: string },
    @Param('moodCode') moodCode: string,
  ) {
    return this.matchingService.leavePool(user.userId, moodCode);
  }

  // Get your current active match
  @Get('active')
  getActive(@CurrentUser() user: { userId: string }) {
    return this.matchingService.getActiveMatch(user.userId);
  }

  // Get all mood tags
  @Get('moods')
  getMoods() {
    return this.matchingService.getMoods();
  }

  // End an active match
  @Post(':id/end')
  endMatch(
    @CurrentUser() user: { userId: string },
    @Param('id') matchId: string,
  ) {
    return this.matchingService.endMatch(user.userId, matchId);
  }

  // Get matching history
  @Get('history')
  getHistory(
    @CurrentUser() user: { userId: string },
    @Query('cursor') cursor?: string,
  ) {
    return this.matchingService.getHistory(user.userId, cursor);
  }
}
