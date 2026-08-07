import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@CurrentUser() user: { userId: string }) {
    return this.usersService.findById(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Get(':username')
  getByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }
}
