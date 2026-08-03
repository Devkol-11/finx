import { ArrowDownLeft, ArrowUpRight, Landmark, PiggyBank } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn, formatDate, formatMoney } from '@/lib/utils';
import type { SavingsPlan, Transaction, Wallet } from '@/types/api';

export function BalanceCard({ wallet }: { wallet?: Wallet }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl text-white shadow-[0_20px_60px_rgba(10,31,92,0.35)]"
      style={{
        background: 'linear-gradient(135deg, #0a1f5c 0%, #1347d4 52%, #0693bf 100%)',
      }}
    >
      {/* Mesh glow */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-72 w-72 rounded-full opacity-[0.22]"
        style={{ background: 'radial-gradient(circle, #60a5fa, transparent 65%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-14 -left-10 h-60 w-60 rounded-full opacity-[0.13]"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent 65%)' }}
      />

      <div className="relative px-6 py-6 sm:px-7 sm:py-7">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-black italic leading-none tracking-tight text-white/90">
            Finx
          </span>
          <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-bold tracking-wider backdrop-blur-sm">
            {wallet?.currency ?? 'NGN'}
          </span>
        </div>

        {/* Chip */}
        <div className="mt-5">
          <div className="flex h-7 w-9 flex-col justify-between overflow-hidden rounded-md border border-white/25 bg-gradient-to-br from-yellow-200/90 to-yellow-400/80 p-[3px]">
            <div className="h-[2px] w-full rounded-full bg-yellow-700/40" />
            <div className="h-[2px] w-full rounded-full bg-yellow-700/40" />
            <div className="h-[2px] w-full rounded-full bg-yellow-700/40" />
            <div className="h-[2px] w-full rounded-full bg-yellow-700/40" />
          </div>
        </div>

        {/* Balance */}
        <div className="mt-5">
          <p
            className="text-[2.75rem] font-bold leading-none"
            style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}
          >
            {formatMoney(wallet?.availableBalance)}
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/60">
            Available balance
          </p>
        </div>

        {/* Bottom row */}
        <div className="mt-7 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-blue-100/50">
              Wallet ID
            </p>
            <p className="mt-0.5 font-mono text-sm font-medium tracking-[0.18em] text-white/70">
              •••• •••• {wallet?.id?.slice(-4) ?? '0000'}
            </p>
          </div>
          <div className="flex items-center">
            <div className="h-5 w-5 rounded-full bg-white/35" />
            <div className="-ml-2.5 h-5 w-5 rounded-full bg-white/20" />
          </div>
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
          <p
            className="mt-2 text-2xl font-semibold text-slate-950"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function TransactionCard({
  transaction,
  onClick,
}: {
  transaction: Transaction;
  onClick?: () => void;
}) {
  const isDebit = ['WITHDRAWAL', 'P2P_TRANSFER', 'FEE'].includes(transaction.type);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-100/80 bg-white p-3 text-left transition-all duration-[140ms] hover:border-blue-100 hover:bg-blue-50/40 hover:shadow-[0_2px_12px_rgba(37,99,235,0.08)] active:scale-[0.985]"
    >
      <span
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
          isDebit
            ? 'bg-gradient-to-br from-rose-50 to-rose-100/60 text-rose-600'
            : 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-600'
        )}
      >
        {isDebit ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-950">
          {transaction.description}
        </span>
        <span className="block text-xs text-slate-500">{formatDate(transaction.createdAt)}</span>
      </span>
      <span className="min-w-0 max-w-[48%] text-right">
        <span
          className={cn(
            'block text-sm font-semibold',
            isDebit ? 'text-rose-600' : 'text-emerald-600'
          )}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {isDebit ? '-' : '+'}
          {formatMoney(transaction.amount, transaction.currency)}
        </span>
        <span className="text-xs capitalize text-slate-400">
          {transaction.status.toLowerCase()}
        </span>
      </span>
    </button>
  );
}

export function SavingsCard({ plan }: { plan: SavingsPlan }) {
  const currentAmount = parseFloat(plan.currentAmount) || 0;
  const targetAmount = plan.targetAmount ? parseFloat(plan.targetAmount) : null;

  const progress =
    targetAmount && targetAmount > 0
      ? Math.min(100, Math.round((currentAmount / targetAmount) * 100))
      : null;

  const typeLabel =
    plan.type === 'FLEXIBLE' ? 'Flexible' : plan.type === 'LOCKED' ? 'Locked' : 'Target';

  const statusLabel = plan.status.charAt(0) + plan.status.slice(1).toLowerCase();
  const statusColor =
    plan.status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
      : plan.status === 'MATURED'
      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60'
      : plan.status === 'CANCELLED'
      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60'
      : 'bg-slate-100 text-slate-600';

  const unlockDate = plan.unlockDate
    ? new Date(plan.unlockDate).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-blue-600">
            <PiggyBank className="h-5 w-5" />
            <span className="text-sm font-semibold">{plan.name}</span>
          </div>
          <p
            className="mt-3 break-words text-2xl font-semibold text-slate-950"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatMoney(plan.currentAmount)}
          </p>
          {targetAmount && (
            <p className="text-sm text-slate-500">Target: {formatMoney(plan.targetAmount!)}</p>
          )}
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {progress !== null && (
        <>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {progress}% saved &middot; {typeLabel}
            {plan.type === 'LOCKED' && unlockDate && ` &middot; unlocks ${unlockDate}`}
          </p>
        </>
      )}

      {progress === null && (
        <p className="mt-2 text-xs text-slate-500">
          {typeLabel} savings
          {plan.type === 'LOCKED' && unlockDate && ` &middot; unlocks ${unlockDate}`}
        </p>
      )}
    </Card>
  );
}
