import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CreateCommunityDto } from './dto/create-community.dto';

const communitySelect = {
  id: true,
  name: true,
  description: true,
  type: true,
  createdAt: true,
  category: {
    select: { id: true, name: true, description: true },
  },
  moderator: {
    select: { id: true, username: true, avatarUrl: true },
  },
  _count: {
    select: { members: true, posts: true },
  },
};

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCategories() {
    return this.prisma.communityCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.community.findMany({
      select: communitySelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      select: communitySelect,
    });
    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // PRIVATE communities — only members can view
    if (community.type === 'PRIVATE') {
      if (!userId) {
        throw new ForbiddenException(
          'This community is private — login and join to view it',
        );
      }
      const membership = await this.prisma.userCommunity.findUnique({
        where: { userId_communityId: { userId, communityId: id } },
      });
      if (!membership) {
        throw new ForbiddenException(
          'This community is private — request to join to view it',
        );
      }
    }

    return community;
  }

  async create(moderatorId: string, dto: CreateCommunityDto) {
    // Confirm the category actually exists before creating under it
    const category = await this.prisma.communityCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Prevent duplicate community names within the same category
    const existing = await this.prisma.community.findFirst({
      where: { name: dto.name, categoryId: dto.categoryId },
    });
    if (existing) {
      throw new ConflictException(
        'A community with this name already exists in this category',
      );
    }

    // Create the community AND automatically make the creator a MODERATOR member
    // in a single transaction — a community should never exist with zero members
    return this.prisma.$transaction(async (tx) => {
      const community = await tx.community.create({
        data: {
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          moderatorId,
        },
        select: communitySelect,
      });

      await tx.userCommunity.create({
        data: {
          userId: moderatorId,
          communityId: community.id,
          role: 'MODERATOR',
        },
      });

      return community;
    });
  }

  async join(userId: string, communityId: string) {
    // Confirm community exists
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Check if already a member
    const existing = await this.prisma.userCommunity.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });
    if (existing) {
      throw new ConflictException('Already a member of this community');
    }

    await this.prisma.userCommunity.create({
      data: { userId, communityId, role: 'MEMBER' },
    });

    return { message: 'Joined successfully' };
  }

  async leave(userId: string, communityId: string) {
    const membership = await this.prisma.userCommunity.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });
    if (!membership) {
      throw new NotFoundException('You are not a member of this community');
    }

    // Moderator (creator) cannot leave their own community
    if (membership.role === 'MODERATOR') {
      throw new ConflictException(
        'Moderators cannot leave their own community — transfer ownership first',
      );
    }

    await this.prisma.userCommunity.delete({
      where: { userId_communityId: { userId, communityId } },
    });

    return { message: 'Left community successfully' };
  }

  async getCommunityPosts(
    communityId: string,
    userId?: string,
    cursor?: string,
    take = 20,
  ) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // PRIVATE — only members can see posts
    if (community.type === 'PRIVATE') {
      if (!userId) {
        throw new ForbiddenException(
          'This community is private — login and join to view posts',
        );
      }
      const membership = await this.prisma.userCommunity.findUnique({
        where: { userId_communityId: { userId, communityId } },
      });
      if (!membership) {
        throw new ForbiddenException('This community is private');
      }
    }

    return this.prisma.post.findMany({
      take,
      where: { communityId },
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, username: true, fullname: true, avatarUrl: true },
        },
        _count: { select: { comments: true } },
      },
    });
  }
}
