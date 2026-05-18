import assert from "node:assert/strict";
import test from "node:test";
import { PaymentStatus } from "@prisma/client";
import { AppError } from "../../../utils/ErrorHandler";
import { assertPaymentTransition, isTerminalPaymentStatus } from "../payment-state";

test("allows legal payment state transitions", () => {
  assert.doesNotThrow(() => {
    assertPaymentTransition(PaymentStatus.INITIATED, PaymentStatus.AWAITING_CUSTOMER);
  });
  assert.doesNotThrow(() => {
    assertPaymentTransition(PaymentStatus.PROCESSING, PaymentStatus.SUCCEEDED);
  });
  assert.doesNotThrow(() => {
    assertPaymentTransition(PaymentStatus.SUCCEEDED, PaymentStatus.REVERSED);
  });
});

test("rejects illegal payment state transitions", () => {
  assert.throws(
    () => {
      assertPaymentTransition(PaymentStatus.FAILED, PaymentStatus.SUCCEEDED);
    },
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "ILLEGAL_PAYMENT_STATE_TRANSITION",
  );
});

test("identifies terminal payment statuses", () => {
  assert.equal(isTerminalPaymentStatus(PaymentStatus.SUCCEEDED), true);
  assert.equal(isTerminalPaymentStatus(PaymentStatus.FAILED), true);
  assert.equal(isTerminalPaymentStatus(PaymentStatus.PROCESSING), false);
});
