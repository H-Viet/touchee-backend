import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  // Get available rating types (show these to the user after a match)
  @Get('ratings/types')
  getRatingTypes() {
    return this.ratingsService.getRatingTypes();
  }

  // Rate your match partner
  @Post('matches/:id/rate')
  rateMatch(
    @CurrentUser() user: { userId: string },
    @Param('id') matchId: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingsService.rateMatch(user.userId, matchId, dto);
  }
}
