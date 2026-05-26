import { apiClient } from '@/lib/api-client';

type ProfileResponse = {
  id: string;
  userId: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
};

type UpdateProfilePayload = {
  avatarUrl?: string;
};

type UpdateProfileResponse = {
  message: string;
};

export const profileApi = {
  getProfile: async () => {
    const { data } = await apiClient.get<{ message: string; data: ProfileResponse }>('/profile/me');
    return data.data;
  },
  updateProfile: async (payload: UpdateProfilePayload) => {
    const { data } = await apiClient.patch<UpdateProfileResponse>('/profile/me', payload);
    return data;
  },
};