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
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { VoteCommentDto } from './dto/vote-comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/comments')
  create(
    @CurrentUser() user: { userId: string },
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(user.userId, postId, dto);
  }

  @Get('posts/:id/comments')
  findByPost(@Param('id') postId: string) {
    return this.commentsService.findByPost(postId);
  }

  // "View more replies" — lazy loads deeper levels
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

  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/reply')
  reply(
    @CurrentUser() user: { userId: string },
    @Param('id') commentId: string,
    @Body() dto: ReplyCommentDto,
  ) {
    return this.commentsService.reply(user.userId, commentId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/vote')
  vote(
    @CurrentUser() user: { userId: string },
    @Param('id') commentId: string,
    @Body() dto: VoteCommentDto,
  ) {
    return this.commentsService.vote(user.userId, commentId, dto.value);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  delete(
    @CurrentUser() user: { userId: string },
    @Param('id') commentId: string,
  ) {
    return this.commentsService.delete(user.userId, commentId);
  }
}
