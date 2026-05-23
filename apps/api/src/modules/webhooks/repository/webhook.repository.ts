import { KycProvider, PaymentProvider } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { WebhookEventStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CustomerIdentificationFailedEvent, CustomerIdentificationSuccessEvent, PaystackChargeSuccessWebhook } from '../types';

type chargeWebhookData = PaystackChargeSuccessWebhook['data'];

export async function processIdempotentChargeWebhook(input: { providerEventId: string; payload: chargeWebhookData; eventType: string }) {
  const existing = await prisma.webhookEvent.findUnique({
    where: {
      providerEventId: input.providerEventId
    }
  });

  if (existing?.status === WebhookEventStatus.PROCESSED) {
    return {
      duplicated: true,
      webhook: existing
    };
  }

  const webhook = await prisma.webhookEvent.upsert({
    where: {
      providerEventId: input.providerEventId
    },
    create: {
      providerEventId: input.providerEventId,
      provider: PaymentProvider.PAYSTACK,
      eventType: input.eventType,
      payload: input.payload as Prisma.InputJsonValue,
      status: WebhookEventStatus.PENDING
    },
    update: {}
  });

  return {
    duplicated: false,
    webhook
  };
}

type kycWebhookData = CustomerIdentificationSuccessEvent['data'] | CustomerIdentificationFailedEvent['data'];

export async function processIdempodentKycWebhook(input: { customerId: string; payload: kycWebhookData; eventType: string }) {
  const existing = await prisma.webhookEvent.findUnique({
    where: {
      providerEventId: input.customerId
    }
  });

  if (existing?.status === WebhookEventStatus.PROCESSED) {
    return {
      duplicated: true,
      webhook: existing
    };
  }

  const webhook = await prisma.webhookEvent.upsert({
    where: {
      providerEventId: input.customerId
    },
    create: {
      providerEventId: input.customerId,
      provider: KycProvider.PAYSTACK,
      eventType: input.eventType,
      payload: input.payload as Prisma.InputJsonValue,
      status: WebhookEventStatus.PENDING
    },
    update: {}
  });

  return {
    duplicated: false,
    webhook
  };
}
