import type { SavingsActivity, SavingsPlan } from "@/types/api";

const savingsPlans: SavingsPlan[] = [
  {
    id: "emergency",
    name: "Emergency Pocket",
    description: "Flexible savings for urgent expenses.",
    targetAmount: 750000,
    savedAmount: 420000,
    lockDurationDays: 90,
    maturityDate: "2026-08-30",
    frequency: "Weekly",
    status: "Active",
  },
  {
    id: "rent",
    name: "Rent Vault",
    description: "Locked monthly savings for rent.",
    targetAmount: 1800000,
    savedAmount: 960000,
    lockDurationDays: 180,
    maturityDate: "2026-11-15",
    frequency: "Monthly",
    status: "Active",
  },
];

const savingsActivity: SavingsActivity[] = [
  { id: "sa-1", planId: "emergency", description: "Weekly auto-save", amount: 50000, createdAt: "2026-05-10" },
  { id: "sa-2", planId: "rent", description: "Manual top-up", amount: 120000, createdAt: "2026-05-06" },
];

const wait = (ms = 250) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const savingsApi = {
  listPlans: async () => {
    await wait();
    return savingsPlans;
  },
  getPlan: async (id: string) => {
    await wait();
    return savingsPlans.find((plan) => plan.id === id) ?? savingsPlans[0];
  },
  listActivity: async (planId?: string) => {
    await wait();
    return planId ? savingsActivity.filter((item) => item.planId === planId) : savingsActivity;
  },
  createPlan: async (input: Pick<SavingsPlan, "name" | "targetAmount" | "lockDurationDays" | "frequency">) => {
    await wait();
    const plan = {
      id: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: "New savings goal",
      savedAmount: 0,
      maturityDate: new Date(Date.now() + input.lockDurationDays * 24 * 60 * 60 * 1000).toISOString(),
      status: "Active" as const,
      ...input,
    };
    savingsPlans.unshift(plan);
    return plan;
  },
};
