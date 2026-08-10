import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { VoteValue } from '@prisma/client';
import { CreatePostDto } from './dto/create-post.dto';

const authorSelect = {
  id: true,
  username: true,
  fullname: true,
  avatarUrl: true,
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreatePostDto) {
    // Fetch community to check its type
    const community = await this.prisma.community.findUnique({
      where: { id: dto.communityId },
    });
    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // PUBLIC communities — anyone can post
    // RESTRICTED/PRIVATE — must be a member
    if (community.type !== 'PUBLIC') {
      const membership = await this.prisma.userCommunity.findUnique({
        where: {
          userId_communityId: {
            userId: authorId,
            communityId: dto.communityId,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenException(
          community.type === 'PRIVATE'
            ? 'This community is private — request to join first'
            : 'You must be a member to post in this community',
        );
      }
    }

    return this.prisma.post.create({
      data: { ...dto, authorId },
      include: {
        author: { select: authorSelect },
        _count: { select: { comments: true } },
      },
    });
  }

  async getFeed(communityId?: string, cursor?: string, take = 20) {
    return this.prisma.post.findMany({
      take,
      where: communityId ? { communityId } : undefined,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: authorSelect },
        _count: { select: { comments: true } },
      },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: authorSelect },
        _count: { select: { comments: true } },
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  // Voting the same direction again removes the vote,
  // voting the opposite direction flips it. PostVote is the source of truth;
  // Post.upVote/downVote are denormalized counters kept in sync here.
  async vote(userId: string, postId: string, value: VoteValue) {
    const existing = await this.prisma.postVote.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    return this.prisma.$transaction(async (tx) => {
      if (!existing) {
        await tx.postVote.create({ data: { postId, userId, value } });
        await tx.post.update({
          where: { id: postId },
          data:
            value === 'UP'
              ? { upVote: { increment: 1 } }
              : { downVote: { increment: 1 } },
        });
        return { voted: value };
      }

      if (existing.value === value) {
        await tx.postVote.delete({ where: { id: existing.id } });
        await tx.post.update({
          where: { id: postId },
          data:
            value === 'UP'
              ? { upVote: { decrement: 1 } }
              : { downVote: { decrement: 1 } },
        });
        return { voted: null };
      }

      await tx.postVote.update({ where: { id: existing.id }, data: { value } });
      await tx.post.update({
        where: { id: postId },
        data:
          value === 'UP'
            ? { upVote: { increment: 1 }, downVote: { decrement: 1 } }
            : { upVote: { decrement: 1 }, downVote: { increment: 1 } },
      });
      return { voted: value };
    });
  }
}
