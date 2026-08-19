import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@app/database';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;
const DEFAULT_ROLE_NAME = 'user';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const [existingAccount, existingUsername] = await Promise.all([
      this.prisma.account.findUnique({ where: { email: dto.email } }),
      this.prisma.user.findUnique({ where: { username: dto.username } }),
    ]);

    if (existingAccount) {
      throw new ConflictException('Email already in use');
    }
    if (existingUsername) {
      throw new ConflictException('Username already in use');
    }

    // Account requires a roleId — this comes from the seeded Role table.
    // Run `npx prisma db seed` if this ever throws.
    const defaultRole = await this.prisma.role.findUnique({
      where: { name: DEFAULT_ROLE_NAME },
    });
    if (!defaultRole) {
      throw new InternalServerErrorException(
        `Default role "${DEFAULT_ROLE_NAME}" not found — run "npx prisma db seed" first`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Account and User are created together — if User creation fails,
    // we don't want an orphaned Account left behind.
    const user = await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          email: dto.email,
          passwordHash,
          roleId: defaultRole.id,
        },
      });

      return tx.user.create({
        data: {
          accountId: account.id,
          fullname: dto.fullname,
          username: dto.username,
        },
      });
    });

    return this.buildAuthResponse(user.id, dto.email, user.username);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const account = await this.prisma.account.findUnique({
      where: { email: dto.email },
      include: { user: true },
    });

    if (!account || !account.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      account.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.account.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildAuthResponse(
      account.user.id,
      account.email,
      account.user.username,
      account.id,
      ipAddress,
      userAgent,
    );
  }

  async refresh(refreshToken: string) {
    // Find all non-revoked, non-expired tokens and check which one matches
    // We can't query by token directly since we store hashes
    // So we find by a secondary index — but actually we store token hash
    // Better approach: store a token ID in the JWT payload

    // Find the token record — we'll use a lookup by prefix trick
    // Actually simplest: find recent non-expired tokens for validation
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { account: { include: { user: true } } },
      // We'll verify the hash below
    });

    // Better approach — store tokenId in the refresh token JWT itself
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Find the specific token record by ID stored in the JWT
    const record = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti }, // jti = JWT ID, we'll store tokenId here
      include: { account: { include: { user: true } } },
    });

    if (!record || record.isRevoked || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Verify the actual token hash
    const tokenMatches = await bcrypt.compare(refreshToken, record.token);
    if (!tokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate — revoke old token, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { isRevoked: true },
    });

    return this.buildAuthResponse(
      record.account.user!.id,
      record.account.email,
      record.account.user!.username,
      record.accountId,
    );
  }

  async logout(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      await this.prisma.refreshToken.update({
        where: { id: payload.jti },
        data: { isRevoked: true },
      });
    } catch {
      // Token invalid — nothing to revoke, that's fine
    }
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    // Revoke ALL refresh tokens for this user — "logout from all devices"
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { account: true },
    });
    if (!user) return;

    await this.prisma.refreshToken.updateMany({
      where: { accountId: user.account!.id, isRevoked: false },
      data: { isRevoked: true },
    });

    return { message: 'Logged out from all devices' };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async buildAuthResponse(
    userId: string,
    email: string,
    username: string,
    accountId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const accessToken = this.jwt.sign(
      { sub: userId, email, username },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: '15m', // short-lived
      },
    );

    // Only create refresh token if we have an accountId (login/register, not internal calls)
    if (!accountId) {
      return { accessToken, user: { id: userId, email, username } };
    }

    // Create a refresh token record
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const refreshTokenValue = this.jwt.sign(
      { sub: userId, jti: tokenId }, // jti = token ID for lookup
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    // Store hash in DB — never store plaintext tokens
    const tokenHash = await bcrypt.hash(refreshTokenValue, SALT_ROUNDS);
    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        token: tokenHash,
        accountId,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: { id: userId, email, username },
    };
  }
}
