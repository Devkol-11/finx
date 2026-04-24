export type PaymentJobPayload = {
  bookingId: string;
  amount: number;
  currency?: string;
};

export const handlePaymentJob = async (data: unknown) => {
  const payload = data as PaymentJobPayload;

  if (
    !payload ||
    typeof payload.bookingId !== "string" ||
    payload.bookingId.trim() === "" ||
    typeof payload.amount !== "number" ||
    !Number.isFinite(payload.amount)
  ) {
    throw new Error("Invalid payment job payload");
  }

  console.log("[PAYMENT HANDLER] Processing payment:", payload);

  await new Promise((resolve) => setTimeout(resolve, 150));

  // Minimal stub
  return {
    status: "processed",
    bookingId: payload.bookingId,
    amount: payload.amount,
    currency: payload.currency ?? "NGN",
  };
};
