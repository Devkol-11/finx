import { InvestmentPlanType, Prisma } from "@prisma/client";

export type PayoutFrequency = "DAILY" | "MONTHLY" | "MATURITY";
export type InvestmentPlanKey = "FLEX_DAILY" | "FIXED_LOCK" | "WEALTH_MONTHLY";

export interface IInvestmentStrategy {
  readonly key: InvestmentPlanKey;
  readonly name: string;
  readonly description: string;
  readonly apy: Prisma.Decimal;
  readonly payoutFrequency: PayoutFrequency;
  readonly lockPeriodDays: number | null;
  readonly planType: InvestmentPlanType;

  calculateInterest(amount: Prisma.Decimal, duration: number): Prisma.Decimal;
  canWithdraw(startDate: Date): boolean;
  getMaturityDate(startDate: Date): Date | null;
}
