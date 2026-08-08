import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';

@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Get('categories')
  getCategories() {
    return this.communitiesService.findAllCategories();
  }

  @Get()
  findAll() {
    return this.communitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.communitiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCommunityDto,
  ) {
    return this.communitiesService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  join(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.communitiesService.join(user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/leave')
  leave(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.communitiesService.leave(user.userId, id);
  }

  @Get(':id/posts')
  getCommunityPosts(@Param('id') id: string, @Query('cursor') cursor?: string) {
    return this.communitiesService.getCommunityPosts(id, cursor);
  }
}
