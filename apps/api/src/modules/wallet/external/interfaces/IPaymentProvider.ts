export interface InitiateDepositPayload {
  amount: string;
  currency: string;
  email: string;
  callbackUrl?: string;
  reference: string;
  metadata?: Record<string, unknown>;
}

export interface InitiateDepositResult {
  provider: string;
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

export interface VerifyTransactionResult {
  reference: string;
  providerTransactionId?: bigint;
  status: 'success' | 'failed' | 'pending' | 'abandoned';
  amount: string;
  currency: string;
  gatewayResponse?: string | undefined;
  channel?: string | undefined;
  paidAt?: Date | undefined;
  fees?: string | undefined;
  authorizationCode?: string | undefined;
  reusableAuthorization?: boolean | undefined;
  raw: unknown;
}

export interface TransferToBankPayload {
  amount: string;
  currency: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  narration?: string;
  reference: string;
  metadata?: Record<string, unknown>;
}

export interface TransferToBankResult {
  provider: string;
  reference: string;
  status: 'success' | 'failed' | 'pending';
  recipientCode?: string | undefined;
  transferCode?: string | undefined;
  providerTransferId?: bigint | undefined;
  gatewayResponse?: string | undefined;
  raw: unknown;
}

export interface IPaymentProvider {
  initiateDeposit(payload: InitiateDepositPayload): Promise<InitiateDepositResult>;
  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;
  transferToBank(payload: TransferToBankPayload): Promise<TransferToBankResult>;
}
