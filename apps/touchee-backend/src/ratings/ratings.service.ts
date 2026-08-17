import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async rateMatch(raterId: string, matchId: string, dto: CreateRatingDto) {
    // Confirm match exists
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match not found');

    // Only participants can rate
    if (match.userAId !== raterId && match.userBId !== raterId) {
      throw new ForbiddenException('You were not part of this match');
    }

    // Can only rate ended matches
    if (match.status !== 'ENDED') {
      throw new BadRequestException(
        'You can only rate a match after it has ended',
      );
    }

    // Can't rate twice
    const existing = await this.prisma.rating.findFirst({
      where: { matchId, raterId },
    });
    if (existing) {
      throw new ConflictException('You have already rated this match');
    }

    // Find the rating type
    const ratingType = await this.prisma.ratingType.findUnique({
      where: { code: dto.ratingTypeCode },
    });
    if (!ratingType) {
      throw new NotFoundException(
        `Rating type "${dto.ratingTypeCode}" not found`,
      );
    }

    // The ratee is the OTHER person in the match
    const rateeId = match.userAId === raterId ? match.userBId : match.userAId;

    // Create rating + update ratee's accScore in one transaction
    return this.prisma.$transaction(async (tx) => {
      const rating = await tx.rating.create({
        data: {
          matchId,
          chatId: match.chatId,
          raterId,
          rateeId,
          ratingTypeId: ratingType.id,
          context: dto.context,
        },
        include: {
          ratingType: true,
          ratee: { select: { id: true, username: true, accScore: true } },
        },
      });

      // Update the ratee's accumulated score
      await tx.user.update({
        where: { id: rateeId },
        data: { accScore: { increment: ratingType.score } },
      });

      return rating;
    });
  }

  async getRatingTypes() {
    return this.prisma.ratingType.findMany({
      orderBy: { score: 'desc' },
    });
  }
}
