import { AppError } from '../../utils/ErrorHandler';
import { UpdateProfileInput } from './http/profile.schema';
import { ProfileRepository } from './profile.repository';

export class ProfileService {
  constructor(private readonly ProfileRepository: ProfileRepository) {}

  public getProfile = async (userId: string) => {
    const profile = await this.ProfileRepository.getUserProfile(userId);
    if (!profile) {
      throw AppError.notFound('No profile found for this user');
    }

    return {
      message: 'Profile fetched successfully',
      data: { ...profile }
    };
  };
  public updateProfile = async (userId: string, input: UpdateProfileInput) => {
    const exists = await this.ProfileRepository.existsById(userId);
    if (!exists) {
      throw AppError.notFound('No profile found for this user');
    }

    await this.ProfileRepository.updateUserProfile(userId, { avatarUrl: input.avatarUrl });

    return {
      message: 'Profile updated successfully'
    };
  };
}
