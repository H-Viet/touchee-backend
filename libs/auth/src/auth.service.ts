import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@app/database';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;
const DEFAULT_ROLE_NAME = 'user';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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

  async login(dto: LoginDto) {
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

    return this.buildAuthResponse(
      account.user.id,
      account.email,
      account.user.username,
    );
  }

  private buildAuthResponse(userId: string, email: string, username: string) {
    const accessToken = this.jwt.sign({ sub: userId, email, username });
    return { accessToken, user: { id: userId, email, username } };
  }
}
