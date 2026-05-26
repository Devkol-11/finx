import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, CheckCheck, Copy, PiggyBank, ReceiptText, Send, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { BalanceCard, SavingsCard, TransactionCard } from '@/components/common/cards';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { walletApi } from '@/features/wallet/api';
import { savingsApi } from '@/features/savings/api';
import { DepositModal } from '@/features/wallet/deposit-modal';
import { TransferModal } from '@/features/wallet/transfers-modal';
import { formatMoney } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';
import type { RootState } from '@/store';

export default function DashboardPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const balance = useQuery({ queryKey: ['wallet', 'balance'], queryFn: walletApi.balance });
  const savings = useQuery({ queryKey: ['savings', 'plans'], queryFn: savingsApi.listPlans });
  const setSelectedTransaction = useUiStore((state) => state.setSelectedTransaction);
  const [copied, setCopied] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  if (balance.isLoading) return <PageSkeleton />;
  if (balance.isError) return <ErrorState onRetry={() => balance.refetch()} />;

  const savingsTotal = savings.data?.reduce((sum, plan) => sum + Number(plan.currentAmount), 0) ?? 0;
  const activePlans = savings.data?.filter((p) => p.status === 'ACTIVE').length ?? 0;
  const txCount = balance.data?.recentActivity.length ?? 0;

  // 🔍 This is where Total Deposited comes from - filters DEPOSIT transactions and sums amounts
  const totalDeposited = balance.data?.recentActivity.filter((t) => t.type === 'DEPOSIT').reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  const handleCopy = () => {
    if (!user?.finxTag) return;
    navigator.clipboard.writeText(`@${user.finxTag}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-5">
      {/* ── Greeting ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {greeting()}, {user?.firstName ?? 'there'} 👋
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">Here's what's happening with your Finx account today.</p>
      </div>

      {/* ── Balance card + action buttons as one fused unit ── */}
      <div className="overflow-hidden rounded-3xl shadow-[0_24px_60px_rgba(37,99,235,0.22)]">
        <div className="[&>div]:rounded-b-none [&>div]:shadow-none">
          <BalanceCard wallet={balance.data?.wallet} />
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/15 bg-gradient-to-br from-blue-800 to-cyan-600">
          <button
            type="button"
            onClick={() => setDepositOpen(true)}
            className="group flex items-center justify-center gap-2.5 px-5 py-4 transition-all duration-200 hover:bg-white/10 active:bg-white/20"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur-sm transition-colors group-hover:bg-white/25">
              <ArrowDownToLine className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Deposit</p>
              <p className="text-[11px] text-blue-100/70">Add funds</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            className="group flex items-center justify-center gap-2.5 px-5 py-4 transition-all duration-200 hover:bg-white/10 active:bg-white/20"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur-sm transition-colors group-hover:bg-white/25">
              <Send className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Transfer</p>
              <p className="text-[11px] text-blue-100/70">Send via FinxTag</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} />

      {/* ── Quick stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs text-gray-500 leading-tight">Total deposited</p>
          </div>
          <p className="mt-2 truncate text-base font-bold text-gray-900">{formatMoney(totalDeposited.toString())}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600">
              <PiggyBank className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs text-gray-500 leading-tight">Total saved</p>
          </div>
          <p className="mt-2 truncate text-base font-bold text-gray-900">{formatMoney(savingsTotal.toString())}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <ReceiptText className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs text-gray-500 leading-tight">Transactions</p>
          </div>
          <p className="mt-2 text-base font-bold text-gray-900">{txCount} recent</p>
        </Card>
      </div>

      {/* ── FinxTag share strip ── */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Share your FinxTag</p>
            <p className="mt-0.5 text-xs text-gray-500">Let friends send you money instantly — no account number needed.</p>
            <p className="mt-2 font-mono text-sm font-bold text-primary-600">@{user?.finxTag ?? '---'}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 shadow-sm transition-all duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 active:scale-95"
          >
            {copied ? (
              <>
                <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy tag</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* ── Main content grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/transactions">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {balance.data?.recentActivity.length ? (
              balance.data.recentActivity
                .slice(0, 5)
                .map((item) => <TransactionCard key={item.id} transaction={item} onClick={() => setSelectedTransaction(item)} />)
            ) : (
              <EmptyState title="No activity yet" description="Your deposits, transfers, and savings payouts will appear here." />
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Savings</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/app/savings">Open</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {savings.data?.[0] ? (
                <>
                  <SavingsCard plan={savings.data[0]} />
                  {activePlans > 1 && (
                    <p className="text-center text-xs text-gray-400">
                      +{activePlans - 1} more active plan{activePlans - 1 > 1 ? 's' : ''}
                    </p>
                  )}
                </>
              ) : (
                <EmptyState title="Start a plan" description="Create a savings pocket and fund it from your wallet." />
              )}
            </CardContent>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Wallet rhythm</p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Keep everyday spending in your wallet and move planned money into savings pockets when you're ready.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/app/savings">Open savings</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
