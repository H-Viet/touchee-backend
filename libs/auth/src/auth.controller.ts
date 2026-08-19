import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new account' })
  @ApiResponse({
    status: 201,
    description: 'Account created, returns JWT + user info',
  })
  @ApiResponse({ status: 409, description: 'Email or username already in use' })
  @Post('register')
  register(@Body() dto: RegisterDto, @Request() req: any) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Login to an existing account' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT + user info',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Request() req: any) {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @ApiOperation({
    summary:
      'Exchange a valid refreshToken for a new accessToken + refreshToken pair',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns new token pair — old refreshToken is revoked (rotation)',
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Logout — revokes the refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Logout from ALL devices — revokes every refresh token for this account',
  })
  @ApiResponse({ status: 200, description: 'All sessions revoked' })
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  logoutAll(@CurrentUser() user: { userId: string }) {
    return this.authService.logoutAll(user.userId);
  }
}
