import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@ApiTags('Ratings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  // Get available rating types (show these to the user after a match)
  @ApiOperation({
    summary:
      'Get available rating types — show these to the user after a match ends',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns rating types ordered by score descending',
  })
  @Get('ratings/types')
  getRatingTypes() {
    return this.ratingsService.getRatingTypes();
  }

  // Rate your match partner
  @ApiOperation({
    summary:
      'Rate your match partner — updates their accScore and cannot be done twice per match',
  })
  @ApiResponse({
    status: 201,
    description: 'Rating submitted — ratee accScore updated',
  })
  @ApiResponse({
    status: 400,
    description: 'Match is still active or already rated',
  })
  @ApiResponse({ status: 403, description: 'Not a participant in this match' })
  @ApiResponse({ status: 409, description: 'Already rated this match' })
  @Post('matches/:id/rate')
  rateMatch(
    @CurrentUser() user: { userId: string },
    @Param('id') matchId: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingsService.rateMatch(user.userId, matchId, dto);
  }
}
