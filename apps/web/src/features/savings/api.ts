import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/api';

export type SavingsPlanType = 'FLEXIBLE' | 'LOCKED' | 'TARGET';
export type SavingsPlanStatus = 'ACTIVE' | 'CANCELLED' | 'MATURED' | 'PAUSED';
export type SavingsCurrency = 'NGN' | 'USD' | 'USDT' | 'USDC' | 'ETH' | 'BTC';

export type SavingsTransaction = {
  id: string;
  amount: string;
  type: string;
  createdAt: string;
  description?: string;
};

export type SavingsPlan = {
  id: string;
  name: string;
  description: string | null;
  type: SavingsPlanType;
  status: SavingsPlanStatus;
  locked: boolean;
  targetAmount: string | null;
  currentAmount: string;
  cancelReason: string | null;
  unlockDate: string | null;
  walletId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  transactions?: SavingsTransaction[];
};

export type CreatePlanInput = {
  type: SavingsPlanType;
  name: string;
  description?: string | null;
  targetAmount?: string;
  unlockDate?: string;
  locked?: boolean;
  currency: SavingsCurrency; // 🔥 FIX: Now supports all currencies
};

// 🔥 NEW: Helper to validate amount format before sending
function validateAmountFormat(amount: string): boolean {
  const regex = /^\d+(\.\d{1,2})?$/;
  return regex.test(amount);
}

// 🔥 NEW: Helper to strip commas and validate
function sanitizeAmount(amount: string): string {
  // Remove commas and whitespace
  let cleaned = amount.replace(/,/g, '').trim();
  // Ensure it matches the backend regex
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid amount format: ${amount}. Use format like "750000" or "750000.50"`);
  }
  return cleaned;
}

export const savingsApi = {
  listPlans: async () => {
    const { data } = await apiClient.get<ApiEnvelope<SavingsPlan[]>>('/savings/plans');
    return data.data;
  },

  getPlan: async (planId: string) => {
    const { data } = await apiClient.get<ApiEnvelope<SavingsPlan>>(`/savings/plans/${planId}`);
    return data.data;
  },

  createPlan: async (input: CreatePlanInput) => {
    let validatedInput = { ...input };
    if (validatedInput.targetAmount) {
      validatedInput.targetAmount = sanitizeAmount(validatedInput.targetAmount);
    }

    const { data } = await apiClient.post<ApiEnvelope<SavingsPlan>>('/savings/plans', validatedInput);
    return data.data;
  },

  fundPlan: async (planId: string, amount: string) => {
    const sanitizedAmount = sanitizeAmount(amount);

    const { data } = await apiClient.post<ApiEnvelope<SavingsPlan>>(`/savings/plans/${planId}/fund`, {
      amount: sanitizedAmount,
      reference: `fund_${globalThis.crypto.randomUUID()}`
    });
    return data.data;
  },

  withdrawFromPlan: async (planId: string, amount: string) => {
    const sanitizedAmount = sanitizeAmount(amount);

    const { data } = await apiClient.post<ApiEnvelope<SavingsPlan>>(`/savings/plans/${planId}/withdraw`, {
      amount: sanitizedAmount,
      reference: `wd_${globalThis.crypto.randomUUID()}`
    });
    return data.data;
  },

  cancelPlan: async (planId: string, reason?: string) => {
    const { data } = await apiClient.post<ApiEnvelope<SavingsPlan>>(`/savings/plans/${planId}/cancel`, { reason });
    return data.data;
  }
};
