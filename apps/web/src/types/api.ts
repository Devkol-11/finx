export type ApiEnvelope<T> = {
  message: string;
  data: T;
};

export type User = {
  id: string;
  email: string;
  finxTag: string;
  firstName: string;
  lastName: string;
  kycVerified: boolean;
  avatarUrl?: string;
};

export type Wallet = {
  id: string;
  currency: 'NGN';
  type: 'FIAT';
  availableBalance: string;
  pendingBalance?: string;
  reservedBalance?: string;
};

export type Transaction = {
  id: string;
  reference: string | null;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'P2P_TRANSFER' | 'FEE' | 'REVERSAL' | 'ADJUSTMENT';
  status: 'PENDING' | 'POSTED' | 'REVERSED' | 'FAILED';
  amount: string;
  currency: Wallet['currency'];
  description: string;
  createdAt: string;
};

// export type SavingsPlan = {
//   id: string;
//   name: string;
//   description: string;
//   targetAmount: number;
//   savedAmount: number;
//   lockDurationDays: number;
//   maturityDate: string;
//   frequency: 'Daily' | 'Weekly' | 'Monthly';
//   status: 'Active' | 'Matured' | 'Paused';
// };

// export type SavingsPlan = {
//   id: string;
//   name: string;
//   description: string | null;
//   type: SavingsPlanType; // 'FLEXIBLE' | 'LOCKED' | 'TARGET'
//   status: SavingsPlanStatus; // 'ACTIVE' | 'CANCELLED' | 'MATURED' | 'PAUSED'
//   locked: boolean;
//   targetAmount: string | null;
//   currentAmount: string;
//   cancelReason: string | null;
//   unlockDate: string | null;
//   walletId: string;
//   userId: string;
//   createdAt: string;
//   updatedAt: string;
//   transactions?: SavingsTransaction[];
// };

// export type SavingsActivity = {
//   id: string;
//   planId: string;
//   description: string;
//   amount: number;
//   createdAt: string;
// };

export type SavingsPlan = {
  id: string;
  name: string;
  description: string | null;
  type: 'FLEXIBLE' | 'LOCKED' | 'TARGET';
  status: 'ACTIVE' | 'CANCELLED' | 'MATURED' | 'PAUSED';
  locked: boolean;
  targetAmount: string | null;
  currentAmount: string;
  cancelReason: string | null;
  unlockDate: string | null;
  walletId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};
