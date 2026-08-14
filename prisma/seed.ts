import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding roles...');
  const [userRole] = await Promise.all(
    ['user', 'moderator', 'admin', 'expert'].map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );

  console.log('Seeding levels...');
  await Promise.all([
    prisma.level.upsert({
      where: { code: 'newcomer' },
      update: {},
      create: { code: 'newcomer', name: 'Newcomer', minScore: 0, maxScore: 99 },
    }),
    prisma.level.upsert({
      where: { code: 'regular' },
      update: {},
      create: {
        code: 'regular',
        name: 'Regular',
        minScore: 100,
        maxScore: 499,
      },
    }),
    prisma.level.upsert({
      where: { code: 'trusted' },
      update: {},
      create: {
        code: 'trusted',
        name: 'Trusted',
        minScore: 500,
        maxScore: 999999,
      },
    }),
  ]);

  console.log('Seeding mood tags...');
  await Promise.all(
    [
      { code: 'anxious', name: 'Anxious' },
      { code: 'lonely', name: 'Lonely' },
      { code: 'need_to_vent', name: 'Need to vent' },
      { code: 'overwhelmed', name: 'Overwhelmed' },
    ].map((tag) =>
      prisma.moodTag.upsert({
        where: { code: tag.code },
        update: {},
        create: tag,
      }),
    ),
  );

  console.log('Seeding rating types...');
  await Promise.all(
    [
      { code: 'great_listener', name: 'Great Listener', score: 10 },
      { code: 'good_listener', name: 'Good Listener', score: 5 },
      { code: 'okay', name: 'Okay', score: 1 },
      { code: 'not_helpful', name: 'Not Helpful', score: -5 },
    ].map((rt) =>
      prisma.ratingType.upsert({
        where: { code: rt.code },
        update: {},
        create: rt,
      }),
    ),
  );

  // A bootstrap admin account, used as the moderator for seeded communities.
  console.log('Seeding bootstrap admin...');
  const adminEmail = 'admin@touchee.app';
  let adminAccount = await prisma.account.findUnique({
    where: { email: adminEmail },
    include: { user: true },
  });

  if (!adminAccount) {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
    const created = await prisma.account.create({
      data: {
        email: adminEmail,
        passwordHash,
        roleId: userRole.id, // swap to the admin role manually later if you want
      },
    });
    await prisma.user.create({
      data: {
        accountId: created.id,
        fullname: 'Touchee Admin',
        username: 'touchee_admin',
      },
    });
    adminAccount = await prisma.account.findUnique({
      where: { email: adminEmail },
      include: { user: true },
    });
  }
  const adminUserId = adminAccount!.user!.id;

  console.log('Seeding community categories...');
  const categories = await Promise.all(
    [
      { name: 'Anxiety', description: 'Support and discussion around anxiety' },
      { name: 'Grief', description: 'A space to talk about loss' },
      {
        name: 'Relationships',
        description: 'Navigating relationships of all kinds',
      },
      {
        name: 'Daily Venting',
        description: 'Just need to get something off your chest',
      },
    ].map((c) =>
      prisma.communityCategory.upsert({
        where: { name: c.name },
        update: {},
        create: c,
      }),
    ),
  );

  console.log('Seeding starter communities...');
  for (const category of categories) {
    const communityName = `${category.name} Circle`;
    const existing = await prisma.community.findFirst({
      where: { name: communityName },
    });
    if (!existing) {
      await prisma.community.create({
        data: {
          name: communityName,
          description: `The main community for ${category.name.toLowerCase()}`,
          categoryId: category.id,
          moderatorId: adminUserId,
        },
      });
    }
  }

  console.log('Seeding reactions...');
  await Promise.all(
    [
      { icon: '❤️', type: 'heart' },
      { icon: '😂', type: 'laugh' },
      { icon: '😢', type: 'sad' },
      { icon: '😮', type: 'wow' },
      { icon: '👍', type: 'thumbsup' },
      { icon: '🫂', type: 'hug' },
    ].map((r) =>
      prisma.reaction.upsert({
        where: { type: r.type },
        update: {},
        create: r,
      }),
    ),
  );

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
