import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { VotePostDto } from './dto/vote-post.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a post in a community' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 403, description: 'Not a member of this community' })
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.userId, dto);
  }

  @ApiOperation({ summary: 'Browse the post feed' })
  @ApiQuery({
    name: 'communityId',
    required: false,
    description: 'Filter by community',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination (last post id)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of posts (20 per page)',
  })
  @Get()
  getFeed(
    @Query('communityId') communityId?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.postsService.getFeed(communityId, cursor);
  }

  @ApiOperation({ summary: 'Get a single post by ID' })
  @ApiResponse({ status: 200, description: 'Returns the post' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Upvote or downvote a post — voting the same direction again removes the vote',
  })
  @ApiResponse({
    status: 201,
    description: 'Vote recorded — returns { voted: "UP" | "DOWN" | null }',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
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
