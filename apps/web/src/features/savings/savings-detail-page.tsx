import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarClock,
  CheckCircle2,
  LockKeyhole,
  PiggyBank,
  Target,
  Trash2,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, PageSkeleton } from '@/components/common/states';
import { PageHeader } from '@/components/common/page-header';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { savingsApi, type SavingsPlan } from '@/features/savings/api';
import { formatMoney } from '@/lib/utils';

type ActionType = 'fund' | 'withdraw' | 'cancel' | null;

const typeConfig = {
  FLEXIBLE: {
    icon: Zap,
    label: 'Flexible',
    gradient: 'from-emerald-500 to-teal-500',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-600'
  },
  LOCKED: {
    icon: LockKeyhole,
    label: 'Locked',
    gradient: 'from-rose-500 to-orange-400',
    lightBg: 'bg-rose-50',
    textColor: 'text-rose-600'
  },
  TARGET: {
    icon: Target,
    label: 'Target',
    gradient: 'from-blue-600 to-cyan-500',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-600'
  }
};

function AmountDialog({
  open,
  action,
  amount,
  setAmount,
  onClose,
  onConfirm,
  isPending,
  isError
}: {
  open: boolean;
  action: 'fund' | 'withdraw';
  amount: string;
  setAmount: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  isError: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold text-gray-900">{action === 'fund' ? 'Fund savings plan' : 'Withdraw from plan'}</DialogTitle>
        <DialogDescription className="mt-0.5 text-sm text-gray-500">
          {action === 'fund'
            ? 'Enter the amount to add to this savings pocket from your wallet.'
            : 'Enter the amount to withdraw back to your wallet.'}
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <FormField label="Amount (NGN)">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
              <Input
                className="pl-7 text-lg font-semibold"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              />
            </div>
          </FormField>
          {isError && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p className="text-xs text-rose-600">
                {action === 'withdraw'
                  ? 'Withdrawal failed. This plan may still be locked or have insufficient funds.'
                  : 'Something went wrong. Please try again.'}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={!amount || isPending} onClick={onConfirm}>
              {isPending ? (action === 'fund' ? 'Funding...' : 'Withdrawing...') : action === 'fund' ? 'Fund now' : 'Withdraw'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SavingsDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ActionType>(null);
  const [amount, setAmount] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const plan = useQuery({
    queryKey: ['savings', 'plan', id],
    queryFn: () => savingsApi.getPlan(id)
  });

  const fundMutation = useMutation({
    mutationFn: () => savingsApi.fundPlan(id, amount),
    onSuccess: (updated) => {
      queryClient.setQueryData(['savings', 'plan', id], updated);
      queryClient.invalidateQueries({ queryKey: ['savings', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setAction(null);
      setAmount('');
    }
  });

  const withdrawMutation = useMutation({
    mutationFn: () => savingsApi.withdrawFromPlan(id, amount),
    onSuccess: (updated) => {
      queryClient.setQueryData(['savings', 'plan', id], updated);
      queryClient.invalidateQueries({ queryKey: ['savings', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setAction(null);
      setAmount('');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => savingsApi.cancelPlan(id, cancelReason || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(['savings', 'plan', id], updated);
      queryClient.invalidateQueries({ queryKey: ['savings', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setAction(null);
    }
  });

  if (plan.isLoading) return <PageSkeleton />;
  if (plan.isError || !plan.data) return <ErrorState onRetry={() => plan.refetch()} />;

  const p = plan.data;
  const config = typeConfig[p.type] ?? typeConfig['FLEXIBLE'];
  const TypeIcon = config.icon;

  const currentAmountNum = (() => {
    const num = parseFloat(p.currentAmount);
    return isNaN(num) ? 0 : num;
  })();

  const targetAmountNum = (() => {
    if (!p.targetAmount) return null;
    const num = parseFloat(p.targetAmount);
    return isNaN(num) ? null : num;
  })();

  const progress = targetAmountNum !== null && targetAmountNum > 0 ? Math.min(100, Math.round((currentAmountNum / targetAmountNum) * 100)) : null;

  const remainingAmount = (() => {
    if (targetAmountNum === null || targetAmountNum <= 0) return null;
    const remaining = targetAmountNum - currentAmountNum;
    return remaining > 0 ? remaining : 0;
  })();

  // FLEXIBLE plans can ALWAYS withdraw
  // LOCKED plans can only withdraw after unlockDate
  // TARGET plans can withdraw anytime (treat like flexible)
  const isWithdrawLocked = p.type === 'LOCKED' && !!p.unlockDate && new Date(p.unlockDate) > new Date();

  const isCancelled = p.status === 'CANCELLED';
  const isMatured = p.status === 'MATURED';
  const canAct = !isCancelled && !isMatured;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title={p.name}
        description={p.description ?? 'Savings plan details'}
        action={
          <Button asChild variant="secondary" size="sm">
            <Link to="/app/savings">← Back</Link>
          </Button>
        }
      />

      {/* Hero card */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.gradient} p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.15)]`}
      >
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-44 w-44 rounded-full bg-white/5" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/70">{config.label} plan</p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm ${
              p.status === 'ACTIVE'
                ? 'bg-white/20 text-white'
                : p.status === 'MATURED'
                ? 'bg-emerald-400/30 text-emerald-100'
                : 'bg-red-400/30 text-red-100'
            }`}
          >
            {p.status}
          </span>
        </div>

        <div className="relative mt-5">
          <p className="text-xs font-medium uppercase tracking-widest text-white/60">{p.type === 'TARGET' ? 'Saved so far' : 'Current balance'}</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatMoney(p.currentAmount)}</p>
          {p.targetAmount && targetAmountNum !== null && targetAmountNum > 0 && (
            <p className="mt-1 text-sm text-white/70">of {formatMoney(p.targetAmount)} target</p>
          )}
        </div>

        {progress !== null && (
          <div className="relative mt-5">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>{progress}% of goal</span>
              {remainingAmount !== null && <span>{formatMoney(remainingAmount.toString())} remaining</span>}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Action buttons inside card */}
        {canAct && (
          <div className="relative mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction('fund')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/20 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Fund plan
            </button>
            <button
              type="button"
              disabled={isWithdrawLocked}
              onClick={() => !isWithdrawLocked && setAction('withdraw')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/20 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isWithdrawLocked ? (
                <>
                  <LockKeyhole className="h-4 w-4" />
                  Locked
                </>
              ) : (
                <>
                  <ArrowUpFromLine className="h-4 w-4" />
                  Withdraw
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Cancelled banner */}
      {isCancelled && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <p className="text-sm font-semibold text-rose-700">Plan cancelled</p>
            {p.cancelReason && <p className="mt-0.5 text-xs text-rose-500">Reason: {p.cancelReason}</p>}
            <p className="mt-0.5 text-xs text-rose-500">Any remaining funds have been returned to your wallet.</p>
          </div>
        </div>
      )}

      {/* Matured banner */}
      {isMatured && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-emerald-700">Plan matured</p>
            <p className="mt-0.5 text-xs text-emerald-600">This savings plan has reached maturity. Funds are available for withdrawal.</p>
          </div>
        </div>
      )}

      {/* Lock warning */}
      {isWithdrawLocked && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">
            Withdrawals are locked until{' '}
            <span className="font-semibold">
              {new Date(p.unlockDate!).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
            . You can still fund this plan.
          </p>
        </div>
      )}

      {/* Plan details grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className={`grid h-8 w-8 place-items-center rounded-xl ${config.lightBg} ${config.textColor}`}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs text-gray-400">Plan type</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">{config.label}</p>
        </Card>

        <Card className="p-4">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary-600">
            <PiggyBank className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs text-gray-400">Current balance</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">{formatMoney(p.currentAmount)}</p>
        </Card>

        {p.targetAmount && targetAmountNum !== null && targetAmountNum > 0 && (
          <Card className="p-4">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Target className="h-4 w-4" />
            </div>
            <p className="mt-3 text-xs text-gray-400">Target amount</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">{formatMoney(p.targetAmount)}</p>
          </Card>
        )}

        {p.unlockDate && (
          <Card className="p-4">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <CalendarClock className="h-4 w-4" />
            </div>
            <p className="mt-3 text-xs text-gray-400">Unlock date</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">
              {new Date(p.unlockDate).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </Card>
        )}

        <Card className="p-4">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gray-100 text-gray-500">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs text-gray-400">Created</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">
            {new Date(p.createdAt).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </Card>
      </div>

      {/* Transactions */}
      {p.transactions && p.transactions.length > 0 && (
        <Card className="p-5">
          <p className="mb-4 text-sm font-bold text-gray-900">Transaction history</p>
          <div className="space-y-2">
            {p.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-gray-800">{tx.description ?? tx.type}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <p className="text-sm font-bold text-emerald-600">+{formatMoney(tx.amount)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cancel button */}
      {canAct && (
        <button
          type="button"
          onClick={() => setAction('cancel')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 py-3.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50 active:scale-[0.99]"
        >
          <Trash2 className="h-4 w-4" />
          Cancel this plan
        </button>
      )}

      {/* Fund / Withdraw dialog */}
      <AmountDialog
        open={action === 'fund' || action === 'withdraw'}
        action={(action as 'fund' | 'withdraw') ?? 'fund'}
        amount={amount}
        setAmount={setAmount}
        onClose={() => {
          setAction(null);
          setAmount('');
        }}
        onConfirm={() => (action === 'fund' ? fundMutation.mutate() : withdrawMutation.mutate())}
        isPending={fundMutation.isPending || withdrawMutation.isPending}
        isError={fundMutation.isError || withdrawMutation.isError}
      />

      {/* Cancel dialog */}
      <Dialog open={action === 'cancel'} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold text-gray-900">Cancel savings plan</DialogTitle>
          <DialogDescription className="mt-0.5 text-sm text-gray-500">
            Any saved funds will be returned to your wallet immediately. This cannot be undone.
          </DialogDescription>
          <div className="mt-4 space-y-4">
            <FormField label="Reason (optional)">
              <Input placeholder="Why are you cancelling?" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </FormField>
            {cancelMutation.isError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs text-rose-600">Something went wrong. Please try again.</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setAction(null)} disabled={cancelMutation.isPending}>
                Keep plan
              </Button>
              <Button className="flex-1 bg-rose-500 hover:bg-rose-600" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
                {cancelMutation.isPending ? 'Cancelling...' : 'Yes, cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
