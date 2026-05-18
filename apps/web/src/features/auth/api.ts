import { apiClient } from "@/lib/api-client";
import type { ApiEnvelope, User, Wallet } from "@/types/api";

export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
};
export type ForgotInput = { email: string };

export type AuthResponse = {
  token: string;
  user: User;
  wallet?: Wallet;
};

export const authApi = {
  login: async (input: LoginInput) => {
    const { data } = await apiClient.post<ApiEnvelope<AuthResponse>>("/auth/login", input);
    return data;
  },
  register: async (input: RegisterInput) => {
    const { data } = await apiClient.post<ApiEnvelope<AuthResponse>>("/auth/register", input);
    return data;
  },
  forgotPassword: async (input: ForgotInput) => {
    const { data } = await apiClient.post<{ message: string }>("/auth/forgot-password", input);
    return data;
  },
};
