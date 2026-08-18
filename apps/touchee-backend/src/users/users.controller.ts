import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get your own profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the authenticated user profile',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@CurrentUser() user: { userId: string }) {
    return this.usersService.findById(user.userId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update your own profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @ApiOperation({ summary: 'Get a public profile by username' })
  @ApiResponse({ status: 200, description: 'Returns the public user profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':username')
  getByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }
}
