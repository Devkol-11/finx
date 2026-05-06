import { InvestmentPlanType, Prisma } from "@prisma/client";
import type { IInvestmentStrategy } from "../IInvestmentStrategy";

const FIXED_TERM_DAYS = 365;

export class FixedTermPlan implements IInvestmentStrategy {
  public readonly key = "FIXED_LOCK" as const;
  public readonly name = "Fixed Lock";
  public readonly description =
    "15% APY with a 12-month lock-in and full payout at maturity.";
  public readonly apy = new Prisma.Decimal("0.15");
  public readonly payoutFrequency = "MATURITY" as const;
  public readonly lockPeriodDays = FIXED_TERM_DAYS;
  public readonly planType = InvestmentPlanType.FIXED_TERM;

  public calculateInterest(
    amount: Prisma.Decimal,
    duration: number
  ): Prisma.Decimal {
    return amount.mul(this.apy).mul(duration).div(365).toDecimalPlaces(8);
  }

  public canWithdraw(startDate: Date): boolean {
    return Date.now() >= this.getMaturityDate(startDate)!.getTime();
  }

  public getMaturityDate(startDate: Date): Date {
    return new Date(
      startDate.getTime() + FIXED_TERM_DAYS * 24 * 60 * 60 * 1000
    );
  }
}
