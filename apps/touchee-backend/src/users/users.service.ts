import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { UpdateUserDto } from './dto/update-user.dto';

const publicUserSelect = {
  id: true,
  username: true,
  fullname: true,
  bio: true,
  avatarUrl: true,
  location: true,
  accScore: true,
  streak: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: publicUserSelect,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: publicUserSelect,
    });
  }
}
