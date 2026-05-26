import { prisma } from '../lib/prisma';

export async function runProfileScript() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true
    }
  });

  await prisma.profile.createMany({
    data: users.map((user) => ({
      userId: user.id,
      avatarUrl: `https://api.dicebear.com/9.x/adventurer/svg?seed=${user.email}`
    })),
    skipDuplicates: true
  });
}
