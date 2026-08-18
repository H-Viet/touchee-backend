import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { VoteCommentDto } from './dto/vote-comment.dto';

@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a top-level comment to a post' })
  @ApiResponse({ status: 201, description: 'Comment created at depth 0' })
  @ApiResponse({
    status: 403,
    description: 'Not a member of the community (RESTRICTED/PRIVATE)',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/comments')
  create(
    @CurrentUser() user: { userId: string },
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(user.userId, postId, dto);
  }

  @ApiOperation({
    summary:
      'Get comments on a post — loads depth 0 and 1 only (Reddit-style lazy loading)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns top-level comments with first-level replies nested',
  })
  @Get('posts/:id/comments')
  findByPost(@Param('id') postId: string) {
    return this.commentsService.findByPost(postId);
  }

  // "View more replies" — lazy loads deeper levels
  @ApiOperation({
    summary:
      'Lazy load deeper replies for a comment — the "view more replies" click',
  })
  @ApiQuery({
    name: 'depth',
    required: false,
    description: 'How many levels deeper to load (default: 3)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns nested subtree of replies',
  })
  @Get('comments/:id/replies')
  getSubtree(
    @Param('id') commentId: string,
    @Query('depth', new DefaultValuePipe(3), ParseIntPipe) depth?: string,
  ) {
    return this.commentsService.getSubtree(
      commentId,
      depth ? Number(depth) : 3,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Reply to a comment at any depth (max depth 6)' })
  @ApiResponse({ status: 201, description: 'Reply created' })
  @ApiResponse({
    status: 403,
    description: 'Max depth reached or not a community member',
  })
  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/reply')
  reply(
    @CurrentUser() user: { userId: string },
    @Param('id') commentId: string,
    @Body() dto: ReplyCommentDto,
  ) {
    return this.commentsService.reply(user.userId, commentId, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Upvote or downvote a comment — same toggle logic as posts',
  })
  @ApiResponse({ status: 201, description: 'Vote recorded' })
  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/vote')
  vote(
    @CurrentUser() user: { userId: string },
    @Param('id') commentId: string,
    @Body() dto: VoteCommentDto,
  ) {
    return this.commentsService.vote(user.userId, commentId, dto.value);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete your own comment — cascades to all replies',
  })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiResponse({
    status: 403,
    description: 'Can only delete your own comments',
  })
  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  delete(
    @CurrentUser() user: { userId: string },
    @Param('id') commentId: string,
  ) {
    return this.commentsService.delete(user.userId, commentId);
  }
}
