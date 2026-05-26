import { prisma } from '../../lib/prisma';
import { UpdateProfileInput } from './http/profile.schema';
import { UserStatus } from '@prisma/client';

export class ProfileRepository {
  public async existsById(userId: string): Promise<boolean> {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    return Boolean(existingUser);
  }
  public getUserProfile = async (userId: string) => {
    return await prisma.profile.findUnique({ where: { userId } });
  };

  public updateUserProfile = async (userId: string, data: UpdateProfileInput) => {
    return await prisma.profile.update({ where: { userId }, data: { avatarUrl: data.avatarUrl }, select: { avatarUrl: true } });
  };
}
