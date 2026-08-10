import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { VoteValue } from '@prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';

const MAX_DEPTH = 6;

const authorSelect = {
  id: true,
  username: true,
  fullname: true,
  avatarUrl: true,
};

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper function to check posting access --- with commutiy type
  private async checkCommunityAccess(userId: string, communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) throw new NotFoundException('Community not found');

    if (community.type === 'PUBLIC') return; // anyone can comment

    const membership = await this.prisma.userCommunity.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });
    if (!membership) {
      throw new ForbiddenException(
        community.type === 'PRIVATE'
          ? 'This community is private — join to participate'
          : 'You must be a member to comment in this community',
      );
    }
  }

  // ─── Create top-level comment ────────────────────────────────────────────
  async create(authorId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    await this.checkCommunityAccess(authorId, post.communityId);

    return this.prisma.comment.create({
      data: {
        content: dto.content,
        postId,
        authorId,
        depth: 0,
        path: '',
      },
      include: {
        author: { select: authorSelect },
        _count: { select: { children: true } },
      },
    });
  }

  // ─── Fetch top 2 levels for initial post load  ─────────────
  async findByPost(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    // Load depth 0 and 1 only — deeper levels load on demand via getSubtree()
    const comments = await this.prisma.comment.findMany({
      where: { postId, depth: { lte: 1 } },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: authorSelect },
        _count: { select: { children: true } },
      },
    });

    // Nest depth-1 replies under their parent depth-0 comments in memory
    // Help avoids multiple round trips to the database
    const topLevel = comments.filter((c) => c.depth === 0);
    const replies = comments.filter((c) => c.depth === 1);

    return topLevel.map((comment) => ({
      ...comment,
      children: replies.filter((r) => r.parentId === comment.id),
    }));
  }

  // ─── Lazy load deeper replies  ─────────────
  async getSubtree(commentId: string, depth: number = 3) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const depthLimit = Number(depth);

    // Find all descendants using the path field — one single query, no recursion
    // path contains commentId means this comment is an ancestor
    const descendants = await this.prisma.comment.findMany({
      where: {
        path: { contains: commentId },
        depth: { lte: comment.depth + depthLimit },
      },
      orderBy: [{ depth: 'asc' }, { createdAt: 'asc' }],
      include: {
        author: { select: authorSelect },
        _count: { select: { children: true } },
      },
    });

    // Build the tree structure in memory from flat list
    return this.buildTree(descendants, commentId);
  }

  // ─── Reply to any comment  ────────────────────────────────────
  async reply(authorId: string, parentId: string, dto: ReplyCommentDto) {
    const parent = await this.prisma.comment.findUnique({
      where: { id: parentId },
      include: { post: true },
    });
    if (!parent) throw new NotFoundException('Comment not found');

    // Check depth limit
    if (parent.depth >= MAX_DEPTH) {
      throw new ForbiddenException(
        `Maximum reply depth of ${MAX_DEPTH} reached`,
      );
    }

    // Check community access
    await this.checkCommunityAccess(authorId, parent.post.communityId);

    // Build the path — parent's path + parent's id
    // e.g. parent path = "uuid1.uuid2", new path = "uuid1.uuid2.uuid3"
    const newPath = parent.path ? `${parent.path}.${parent.id}` : parent.id;

    return this.prisma.comment.create({
      data: {
        content: dto.content,
        postId: parent.postId,
        authorId,
        parentId,
        depth: parent.depth + 1,
        path: newPath,
      },
      include: {
        author: { select: authorSelect },
        _count: { select: { children: true } },
      },
    });
  }

  // ─── Vote (same pattern as posts) ────────────────────────────────────────
  async vote(userId: string, commentId: string, value: VoteValue) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

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

  // ─── Delete (cascades to all children automatically via Prisma) ───────────
  async delete(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted' };
  }

  // ─── Helper — build nested tree from flat list ────────────────────────────
  private buildTree(comments: any[], rootParentId: string) {
    const map = new Map<string, any>();
    const roots: any[] = [];

    comments.forEach((c) => {
      map.set(c.id, { ...c, children: [] });
    });

    comments.forEach((c) => {
      if (c.parentId === rootParentId) {
        roots.push(map.get(c.id));
      } else if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId).children.push(map.get(c.id));
      }
    });

    return roots;
  }
}
