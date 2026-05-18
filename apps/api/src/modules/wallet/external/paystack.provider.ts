import { env } from "../../../config/env";
import { AppError } from "../../../utils/ErrorHandler";
import type {
  InitiateDepositPayload,
  InitiateDepositResult,
  IPaymentProvider,
  TransferToBankPayload,
  TransferToBankResult,
  VerifyTransactionResult,
} from "./interfaces/IPaymentProvider";

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_PROVIDER = "paystack";

type PaystackEnvelope<T> = {
  status: boolean;
  message: string;
  data: T;
};

type PaystackInitializeData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

type PaystackAuthorization = {
  authorization_code?: string;
  reusable?: boolean;
};

type PaystackTransactionData = {
  id?: number | string;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  gateway_response?: string | null;
  channel?: string | null;
  paid_at?: string | null;
  paidAt?: string | null;
  fees?: number | null;
  authorization?: PaystackAuthorization | null;
};

type PaystackRecipientData = {
  recipient_code: string;
};

type PaystackTransferData = {
  id?: number | string;
  reference: string;
  transfer_code?: string;
  status: string;
  reason?: string | null;
};

export class PaystackPaymentProvider implements IPaymentProvider {
  public async initiateDeposit(payload: InitiateDepositPayload): Promise<InitiateDepositResult> {
    const result = await this.request<PaystackInitializeData>("/transaction/initialize", {
      method: "POST",
      body: {
        email: payload.email,
        amount: this.toSubunit(payload.amount),
        currency: payload.currency,
        reference: payload.reference,
        ...(payload.callbackUrl ? { callback_url: payload.callbackUrl } : {}),
        ...(payload.metadata ? { metadata: JSON.stringify(payload.metadata) } : {}),
      },
    });

    return {
      provider: PAYSTACK_PROVIDER,
      reference: result.reference,
      authorizationUrl: result.authorization_url,
      accessCode: result.access_code,
    };
  }

  public async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    const result = await this.request<PaystackTransactionData>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
      },
    );

    const normalizedStatus = this.normalizeTransactionStatus(result.status);
    const paidAt = result.paid_at ?? result.paidAt ?? undefined;

    return {
      reference: result.reference,
      ...(result.id !== undefined ? { providerTransactionId: BigInt(result.id) } : {}),
      status: normalizedStatus,
      amount: this.fromSubunit(result.amount),
      currency: result.currency,
      gatewayResponse: result.gateway_response ?? undefined,
      channel: result.channel ?? undefined,
      paidAt: paidAt ? new Date(paidAt) : undefined,
      fees: typeof result.fees === "number" ? this.fromSubunit(result.fees) : undefined,
      authorizationCode: result.authorization?.authorization_code,
      reusableAuthorization: result.authorization?.reusable,
      raw: result,
    };
  }

  public async transferToBank(payload: TransferToBankPayload): Promise<TransferToBankResult> {
    const recipient = await this.request<PaystackRecipientData>("/transferrecipient", {
      method: "POST",
      body: {
        type: "nuban",
        name: payload.accountName,
        account_number: payload.accountNumber,
        bank_code: payload.bankCode,
        currency: payload.currency,
      },
    });

    const transfer = await this.request<PaystackTransferData>("/transfer", {
      method: "POST",
      body: {
        source: "balance",
        amount: this.toSubunit(payload.amount),
        reference: payload.reference,
        recipient: recipient.recipient_code,
        reason: payload.narration ?? `FINX withdrawal ${payload.reference}`,
        ...(payload.metadata ? { metadata: JSON.stringify(payload.metadata) } : {}),
      },
    });

    return {
      provider: PAYSTACK_PROVIDER,
      reference: transfer.reference,
      status: this.normalizeTransferStatus(transfer.status),
      recipientCode: recipient.recipient_code,
      transferCode: transfer.transfer_code,
      ...(transfer.id !== undefined ? { providerTransferId: BigInt(transfer.id) } : {}),
      gatewayResponse: transfer.reason ?? undefined,
      raw: {
        recipient,
        transfer,
      },
    };
  }

  private async request<T>(
    path: string,
    options: {
      method: "GET" | "POST";
      body?: Record<string, unknown>;
    },
  ): Promise<T> {
    if (!env.PAYSTACK_SECRET_KEY) {
      throw new AppError("Payment provider is unavailable.", 503, {
        code: "PROVIDER_UNAVAILABLE",
      });
    }

    const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    let payload: PaystackEnvelope<T> | undefined;

    try {
      payload = (await response.json()) as PaystackEnvelope<T>;
    } catch {
      payload = undefined;
    }

    if (!response.ok || !payload?.status) {
      throw new AppError(payload?.message ?? "Paystack rejected the payment request.", 502, {
        code: "PAYSTACK_REQUEST_FAILED",
        details: {
          statusCode: response.status,
          message: payload?.message,
        },
      });
    }

    return payload.data;
  }

  private toSubunit(amount: string): string {
    const [whole = "0", fraction = ""] = amount.split(".");
    const paddedFraction = `${fraction}00`.slice(0, 2);
    return `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  }

  private fromSubunit(amount: number): string {
    return (amount / 100).toFixed(2);
  }

  private normalizeTransactionStatus(status: string): VerifyTransactionResult["status"] {
    if (status === "success") {
      return "success";
    }

    if (status === "failed") {
      return "failed";
    }

    if (status === "abandoned") {
      return "abandoned";
    }

    return "pending";
  }

  private normalizeTransferStatus(status: string): TransferToBankResult["status"] {
    if (status === "success") {
      return "success";
    }

    if (status === "failed" || status === "reversed") {
      return "failed";
    }

    return "pending";
  }
}
