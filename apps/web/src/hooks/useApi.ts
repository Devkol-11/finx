import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

// Example query hook (customize as needed)
export const useGetUser = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => apiClient.get(`/users/${userId}`),
    enabled: !!userId,
  });
};

// Example mutation hook
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.put('/users/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};
