import { InvestmentPlanType, Prisma } from "@prisma/client";
import type { IInvestmentStrategy } from "../interfaces/IInvestmentStrategy";

const WEALTH_MONTHLY_TERM_DAYS = 180;

export class WealthMonthlyPlan implements IInvestmentStrategy {
  public readonly key = "WEALTH_MONTHLY" as const;
  public readonly name = "Wealth Monthly";
  public readonly description = "10% APY over 6 months with monthly interest payouts and principal at maturity.";
  public readonly apy = new Prisma.Decimal("0.10");
  public readonly payoutFrequency = "MONTHLY" as const;
  public readonly lockPeriodDays = WEALTH_MONTHLY_TERM_DAYS;
  public readonly planType = InvestmentPlanType.FIXED_TERM;

  public calculateInterest(amount: Prisma.Decimal, duration: number): Prisma.Decimal {
    return amount.mul(this.apy).mul(duration).div(365).toDecimalPlaces(8);
  }

  public canWithdraw(startDate: Date): boolean {
    return Date.now() >= this.getMaturityDate(startDate)!.getTime();
  }

  public getMaturityDate(startDate: Date): Date {
    return new Date(startDate.getTime() + WEALTH_MONTHLY_TERM_DAYS * 24 * 60 * 60 * 1000);
  }
}
