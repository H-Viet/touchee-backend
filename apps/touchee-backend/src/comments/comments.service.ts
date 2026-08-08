import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { VoteValue } from '@prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';

const authorSelect = {
  id: true,
  username: true,
  fullname: true,
  avatarUrl: true,
};

const commentSelect = {
  id: true,
  content: true,
  upVote: true,
  downVote: true,
  createdAt: true,
  updatedAt: true,
  author: { select: authorSelect },
  replies: {
    select: {
      id: true,
      content: true,
      upVote: true,
      downVote: true,
      createdAt: true,
      author: { select: authorSelect },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  _count: { select: { replies: true } },
};

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, postId: string, dto: CreateCommentDto) {
    // Confirm the post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check user is a member of the community this post belongs to
    const membership = await this.prisma.userCommunity.findUnique({
      where: {
        userId_communityId: {
          userId: authorId,
          communityId: post.communityId,
        },
      },
    });
    if (!membership) {
      throw new ForbiddenException(
        'You must be a member of this community to comment',
      );
    }

    return this.prisma.comment.create({
      data: {
        content: dto.content,
        postId,
        authorId,
      },
      select: commentSelect,
    });
  }

  async findByPost(postId: string) {
    // Confirm post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Only fetch top-level comments (no replyForCommentId)
    // Their replies come nested inside via commentSelect
    return this.prisma.comment.findMany({
      where: { postId, replyForCommentId: null },
      select: commentSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async reply(authorId: string, commentId: string, dto: CreateCommentDto) {
    // Find the parent comment
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });
    if (!parent) {
      throw new NotFoundException('Comment not found');
    }

    // Check membership in the same community
    const membership = await this.prisma.userCommunity.findUnique({
      where: {
        userId_communityId: {
          userId: authorId,
          communityId: parent.post.communityId,
        },
      },
    });
    if (!membership) {
      throw new ForbiddenException(
        'You must be a member of this community to reply',
      );
    }

    // Prevent replying to a reply — keep nesting flat (one level max)
    if (parent.replyForCommentId !== null) {
      throw new ForbiddenException(
        'Cannot reply to a reply — respond to the top-level comment instead',
      );
    }

    return this.prisma.comment.create({
      data: {
        content: dto.content,
        postId: parent.postId,
        authorId,
        replyForCommentId: commentId,
      },
      select: {
        id: true,
        content: true,
        upVote: true,
        downVote: true,
        createdAt: true,
        author: { select: authorSelect },
      },
    });
  }

  async vote(userId: string, commentId: string, value: VoteValue) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existing = await this.prisma.commentVote.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    return this.prisma.$transaction(async (tx) => {
      if (!existing) {
        await tx.commentVote.create({ data: { commentId, userId, value } });
        await tx.comment.update({
          where: { id: commentId },
          data:
            value === 'UP'
              ? { upVote: { increment: 1 } }
              : { downVote: { increment: 1 } },
        });
        return { voted: value };
      }

      if (existing.value === value) {
        await tx.commentVote.delete({ where: { id: existing.id } });
        await tx.comment.update({
          where: { id: commentId },
          data:
            value === 'UP'
              ? { upVote: { decrement: 1 } }
              : { downVote: { decrement: 1 } },
        });
        return { voted: null };
      }

      await tx.commentVote.update({
        where: { id: existing.id },
        data: { value },
      });
      await tx.comment.update({
        where: { id: commentId },
        data:
          value === 'UP'
            ? { upVote: { increment: 1 }, downVote: { decrement: 1 } }
            : { upVote: { decrement: 1 }, downVote: { increment: 1 } },
      });
      return { voted: value };
    });
  }

  async delete(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only the author can delete their own comment
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted successfully' };
  }
}
