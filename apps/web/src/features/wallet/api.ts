import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, Transaction, Wallet } from '@/types/api';

export type BalanceResponse = {
  wallet: Wallet;
  recentActivity: Transaction[];
};

export type TransactionsResponse = {
  items: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const walletApi = {
  balance: async () => {
    const { data } = await apiClient.get<ApiEnvelope<BalanceResponse>>('/wallet/balance', {
      params: { currency: 'NGN', activityLimit: 8 }
    });
    return data.data;
  },
  transactions: async (params: { page?: number; limit?: number; currency?: string }) => {
    const { data } = await apiClient.get<ApiEnvelope<TransactionsResponse>>('/wallet/transactions', { params });
    return data.data;
  },
  deposit: async (input: { amount: string; currency?: 'NGN'; callbackUrl?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<{ authorizationUrl?: string; reference: string; provider: string }>>(
      '/wallet/deposit/fiat',
      {
        currency: 'NGN',
        ...input
      },
      { headers: { 'x-idempotency-key': globalThis.crypto.randomUUID() } }
    );
    return data;
  },
  withdraw: async (input: { amount: string; bankCode: string; accountNumber: string; accountName: string; narration?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<{ reference: string; amount: string; walletBalance: string }>>('/wallet/withdraw/fiat', {
      currency: 'NGN',
      ...input
    });
    return data;
  },
  transfer: async (input: { finxTag: string; amount: string; narration?: string }) => {
    const { data } = await apiClient.post<
      ApiEnvelope<{
        reference: string;
        amount: string;
        receiver: { finxTag: string; email: string };
        senderBalance: string;
      }>
    >('/wallet/transfer/p2p', { currency: 'NGN', ...input });
    return data;
  }
};
