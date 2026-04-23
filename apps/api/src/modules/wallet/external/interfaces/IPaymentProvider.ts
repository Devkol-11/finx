export interface InitiateDepositPayload {
  amount: string;
  currency: string;
  email: string;
  callbackUrl?: string;
  reference: string;
}

export interface InitiateDepositResult {
  provider: string;
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

export interface VerifyTransactionResult {
  reference: string;
  status: "success" | "failed" | "pending";
  amount: string;
  currency: string;
}

export interface TransferToBankPayload {
  amount: string;
  currency: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  narration?: string;
  reference: string;
}

export interface TransferToBankResult {
  provider: string;
  reference: string;
  status: "success" | "failed" | "pending";
}

export interface IPaymentProvider {
  initiateDeposit(payload: InitiateDepositPayload): Promise<InitiateDepositResult>;
  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;
  transferToBank(payload: TransferToBankPayload): Promise<TransferToBankResult>;
}
