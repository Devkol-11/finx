import { PaymentProvider } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { WebhookEventStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export async function processIdempotentWebhook(input: { providerEventId: string; payload: unknown; eventType: string }) {
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
