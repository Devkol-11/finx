import { ArrowDownLeft, ArrowUpRight, Landmark, PiggyBank } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import type { SavingsPlan, Transaction, Wallet } from "@/types/api";

export function BalanceCard({ wallet }: { wallet?: Wallet }) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-5 text-white shadow-[0_24px_60px_rgba(37,99,235,0.22)] sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-50">Available balance</span>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{wallet?.currency ?? "NGN"}</span>
      </div>
      <div className="mt-8 break-words text-3xl font-semibold tracking-normal sm:text-4xl">{formatMoney(wallet?.availableBalance)}</div>
      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white/12 p-3">
          <p className="text-blue-50">Pending</p>
          <p className="mt-1 font-semibold">{formatMoney(wallet?.pendingBalance)}</p>
        </div>
        <div className="rounded-2xl bg-white/12 p-3">
          <p className="text-blue-50">Reserved</p>
          <p className="mt-1 font-semibold">{formatMoney(wallet?.reservedBalance)}</p>
        </div>
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Landmark;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function TransactionCard({ transaction, onClick }: { transaction: Transaction; onClick?: () => void }) {
  const isDebit = ["WITHDRAWAL", "P2P_TRANSFER", "FEE"].includes(transaction.type);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition hover:border-blue-100 hover:bg-blue-50/40"
    >
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
          isDebit ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600",
        )}
      >
        {isDebit ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-950">{transaction.description}</span>
        <span className="block text-xs text-slate-500">{formatDate(transaction.createdAt)}</span>
      </span>
      <span className="min-w-0 max-w-[48%] text-right">
        <span className={cn("block text-sm font-semibold", isDebit ? "text-rose-600" : "text-emerald-600")}>
          {isDebit ? "-" : "+"}
          {formatMoney(transaction.amount, transaction.currency)}
        </span>
        <span className="text-xs text-slate-400">{transaction.status}</span>
      </span>
    </button>
  );
}

export function SavingsCard({ plan }: { plan: SavingsPlan }) {
  const progress = plan.targetAmount > 0 ? Math.min(100, Math.round((plan.savedAmount / plan.targetAmount) * 100)) : 0;
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-blue-600">
            <PiggyBank className="h-5 w-5" />
            <span className="text-sm font-semibold">{plan.name}</span>
          </div>
          <p className="mt-3 break-words text-2xl font-semibold text-slate-950">{formatMoney(plan.savedAmount)}</p>
          <p className="text-sm text-slate-500">Target: {formatMoney(plan.targetAmount)}</p>
        </div>
        <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{plan.status}</span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {progress}% saved - {plan.frequency} - matures {formatDate(plan.maturityDate)}
      </p>
    </Card>
  );
}
