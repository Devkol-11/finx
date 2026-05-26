import { ArrowDownLeft, ArrowUpRight, Landmark, PiggyBank } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn, formatDate, formatMoney } from '@/lib/utils';
import type { SavingsPlan, Transaction, Wallet } from '@/types/api';

export function BalanceCard({ wallet }: { wallet?: Wallet }) {
  return (
    <div
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-5 text-white shadow-[0_24px_60px_rgba(37,99,235,0.28)] sm:p-6"
    >
      {/* ── Grain texture overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px'
        }}
      />

      {/* ── Decorative circles ── */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-20 w-20 rounded-full bg-cyan-400/20" />

      {/* ── Top row: label + currency badge ── */}
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-blue-100/80">Available balance</span>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wider backdrop-blur-sm">{wallet?.currency ?? 'NGN'}</span>
      </div>

      {/* ── Chip ── */}
      <div className="relative mt-4 flex items-center gap-2">
        <div className="flex h-7 w-9 flex-col justify-between overflow-hidden rounded-md border border-white/30 bg-gradient-to-br from-yellow-200/90 to-yellow-400/80 p-[3px] shadow-inner">
          <div className="h-[2px] w-full rounded-full bg-yellow-600/40" />
          <div className="h-[2px] w-full rounded-full bg-yellow-600/40" />
          <div className="h-[2px] w-full rounded-full bg-yellow-600/40" />
          <div className="h-[2px] w-full rounded-full bg-yellow-600/40" />
        </div>
      </div>

      {/* ── Balance amount ── */}
      <div className="relative mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{formatMoney(wallet?.availableBalance)}</div>

      {/* ── Bottom row: masked number + brand ── */}
      <div className="relative mt-5 flex items-end justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-blue-100/60">Wallet ID</p>
          <p className="font-mono text-sm font-medium tracking-[0.2em] text-white/80">•••• •••• {wallet?.id?.slice(-4) ?? '0000'}</p>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-lg font-black italic tracking-tight text-white/90">Finx</span>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded-full bg-white/30 backdrop-blur-sm" />
            <div className="-ml-2 h-4 w-4 rounded-full bg-white/20 backdrop-blur-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Landmark }) {
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
  const isDebit = ['WITHDRAWAL', 'P2P_TRANSFER', 'FEE'].includes(transaction.type);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition hover:border-blue-100 hover:bg-blue-50/40"
    >
      <span
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
          isDebit ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
        )}
      >
        {isDebit ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-950">{transaction.description}</span>
        <span className="block text-xs text-slate-500">{formatDate(transaction.createdAt)}</span>
      </span>
      <span className="min-w-0 max-w-[48%] text-right">
        <span className={cn('block text-sm font-semibold', isDebit ? 'text-rose-600' : 'text-emerald-600')}>
          {isDebit ? '-' : '+'}
          {formatMoney(transaction.amount, transaction.currency)}
        </span>
        <span className="text-xs text-slate-400">{transaction.status}</span>
      </span>
    </button>
  );
}

export function SavingsCard({ plan }: { plan: SavingsPlan }) {
  const currentAmount = parseFloat(plan.currentAmount) || 0;
  const targetAmount = plan.targetAmount ? parseFloat(plan.targetAmount) : null;

  const progress = targetAmount && targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : null;

  const typeLabel = plan.type === 'FLEXIBLE' ? 'Flexible' : plan.type === 'LOCKED' ? 'Locked' : 'Target';

  const statusLabel = plan.status.charAt(0) + plan.status.slice(1).toLowerCase();
  const statusColor =
    plan.status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700'
      : plan.status === 'MATURED'
      ? 'bg-blue-50 text-blue-700'
      : plan.status === 'CANCELLED'
      ? 'bg-red-50 text-red-700'
      : 'bg-gray-100 text-gray-600';

  const unlockDate = plan.unlockDate
    ? new Date(plan.unlockDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-blue-600">
            <PiggyBank className="h-5 w-5" />
            <span className="text-sm font-semibold">{plan.name}</span>
          </div>
          <p className="mt-3 break-words text-2xl font-semibold text-slate-950">{formatMoney(plan.currentAmount)}</p>
          {targetAmount && <p className="text-sm text-slate-500">Target: {formatMoney(plan.targetAmount!)}</p>}
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
      </div>

      {progress !== null && (
        <>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {progress}% saved - {typeLabel}
            {plan.type === 'LOCKED' && unlockDate && ` - unlocks ${unlockDate}`}
          </p>
        </>
      )}

      {progress === null && (
        <p className="mt-2 text-xs text-slate-500">
          {typeLabel} savings
          {plan.type === 'LOCKED' && unlockDate && ` - unlocks ${unlockDate}`}
        </p>
      )}
    </Card>
  );
}
