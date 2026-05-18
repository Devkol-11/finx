import { prisma } from '../lib/prisma';
import { PaymentProvider, PaymentType, PaymentDirection, WalletCurrency } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export async function seedPaymentIntent() {
  const reference = `save_unique_ref_${Math.floor(Math.random() * 100000)}`;

  const userId = 'd369b002-d9a9-41af-a26d-297245cb66bf'; // use real seeded user
  const wallet = await prisma.wallet.findFirst({ where: { userId } });

  if (!wallet) throw new Error('No wallet found for seed user');

  const intent = await prisma.paymentIntent.create({
    data: {
      id: randomUUID(),
      userId,
      walletId: wallet.id,

      provider: PaymentProvider.PAYSTACK,
      direction: PaymentDirection.INBOUND,
      type: PaymentType.FIAT_DEPOSIT,

      status: 'INITIATED',

      reference,

      amount: 1000,
      currency: WalletCurrency.NGN,

      email: 'test@finx.dev',
      metadata: {
        seed: true
      }
    }
  });

  console.log('Seeded PaymentIntent:', intent.reference);

  console.log('Payment Intent Record : ', intent);

  return intent;
}

// run directly
seedPaymentIntent()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
