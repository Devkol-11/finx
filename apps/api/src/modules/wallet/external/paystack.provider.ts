import { randomUUID } from "node:crypto";
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

/**
 * Paystack provider boundary.
 *
 * This implementation is deliberately lightweight for now and returns
 * deterministic placeholder payloads that match the service contract.
 */
export class PaystackPaymentProvider implements IPaymentProvider {
  public async initiateDeposit(payload: InitiateDepositPayload): Promise<InitiateDepositResult> {
    if (!env.PAYSTACK_SECRET_KEY) {
      throw new AppError("Payment provider is unavailable.", 503, {
        code: "PROVIDER_UNAVAILABLE",
      });
    }

    return {
      provider: "paystack",
      reference: payload.reference,
      authorizationUrl: `https://checkout.paystack.com/${randomUUID()}`,
      accessCode: randomUUID(),
    };
  }

  public async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    return {
      reference,
      status: "pending",
      amount: "0",
      currency: "NGN",
    };
  }

  public async transferToBank(payload: TransferToBankPayload): Promise<TransferToBankResult> {
    if (!env.PAYSTACK_SECRET_KEY) {
      throw new AppError("Payment provider is unavailable.", 503, {
        code: "PROVIDER_UNAVAILABLE",
      });
    }

    return {
      provider: "paystack",
      reference: payload.reference,
      status: "success",
    };
  }
}
