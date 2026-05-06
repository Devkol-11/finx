import { InvestmentPlanType, Prisma } from "@prisma/client";
import type { IInvestmentStrategy } from "../IInvestmentStrategy";

export class FlexDailyPlan implements IInvestmentStrategy {
  public readonly key = "FLEX_DAILY" as const;
  public readonly name = "Flex Daily";
  public readonly description =
    "6% APY with daily interest payouts and instant liquidity.";
  public readonly apy = new Prisma.Decimal("0.06");
  public readonly payoutFrequency = "DAILY" as const;
  public readonly lockPeriodDays = null;
  public readonly planType = InvestmentPlanType.FLEXIBLE_DAILY;

  public calculateInterest(
    amount: Prisma.Decimal,
    duration: number
  ): Prisma.Decimal {
    return amount.mul(this.apy).mul(duration).div(365).toDecimalPlaces(8);
  }

  public canWithdraw(_startDate: Date): boolean {
    return true;
  }

  public getMaturityDate(_startDate: Date): Date | null {
    return null;
  }
}
