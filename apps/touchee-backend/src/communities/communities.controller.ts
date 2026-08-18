import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
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
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';

@ApiTags('Communities')
@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @ApiOperation({
    summary: 'List all community categories (fixed, admin-curated)',
  })
  @ApiResponse({ status: 200, description: 'Returns all categories' })
  @Get('categories')
  getCategories() {
    return this.communitiesService.findAllCategories();
  }

  @ApiOperation({ summary: 'List all communities with member and post counts' })
  @ApiResponse({ status: 200, description: 'Returns all communities' })
  @Get()
  findAll() {
    return this.communitiesService.findAll();
  }

  @ApiOperation({ summary: 'Get a single community by ID' })
  @ApiResponse({
    status: 200,
    description:
      'Returns the community — PRIVATE communities require membership',
  })
  @ApiResponse({
    status: 403,
    description: 'Community is private — join to view',
  })
  @ApiResponse({ status: 404, description: 'Community not found' })
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId;
    return this.communitiesService.findOne(id, userId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Create a new community under a category — creator auto-joins as moderator',
  })
  @ApiResponse({ status: 201, description: 'Community created' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({
    status: 409,
    description: 'Community with this name already exists in this category',
  })
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCommunityDto,
  ) {
    return this.communitiesService.create(user.userId, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Join a community' })
  @ApiResponse({ status: 201, description: 'Joined successfully' })
  @ApiResponse({ status: 409, description: 'Already a member' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  join(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.communitiesService.join(user.userId, id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Leave a community — moderators cannot leave their own community',
  })
  @ApiResponse({ status: 200, description: 'Left successfully' })
  @ApiResponse({ status: 404, description: 'Not a member' })
  @ApiResponse({
    status: 409,
    description: 'Moderators cannot leave their own community',
  })
  @UseGuards(JwtAuthGuard)
  @Delete(':id/leave')
  leave(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.communitiesService.leave(user.userId, id);
  }

  @ApiOperation({ summary: 'Get posts scoped to a specific community' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated posts in this community',
  })
  @ApiResponse({ status: 403, description: 'Community is private' })
  @Get(':id/posts')
  getCommunityPosts(@Param('id') id: string, @Query('cursor') cursor?: string) {
    return this.communitiesService.getCommunityPosts(id, cursor);
  }
}
