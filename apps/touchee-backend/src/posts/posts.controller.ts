import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { VotePostDto } from './dto/vote-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.userId, dto);
  }

  @Get()
  getFeed(
    @Query('communityId') communityId?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.postsService.getFeed(communityId, cursor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/vote')
  vote(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: VotePostDto,
  ) {
    return this.postsService.vote(user.userId, id, dto.value);
  }
}
