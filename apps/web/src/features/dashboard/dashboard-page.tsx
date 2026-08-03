import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  CheckCheck,
  Clock,
  Copy,
  PiggyBank,
  ReceiptText,
  Send,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
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

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 6 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.28, ease: EASE_OUT },
  },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

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

  const savingsTotal =
    savings.data?.reduce((sum, plan) => sum + Number(plan.currentAmount), 0) ?? 0;
  const activePlans = savings.data?.filter((p) => p.status === 'ACTIVE').length ?? 0;
  const txCount = balance.data?.recentActivity.length ?? 0;

  const totalDeposited =
    balance.data?.recentActivity
      .filter((t) => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  const handleCopy = () => {
    if (!user?.finxTag) return;
    navigator.clipboard.writeText(`@${user.finxTag}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const quickActions = [
    {
      icon: Send,
      label: 'Send',
      sublabel: 'Via FinxTag',
      onClick: () => setTransferOpen(true),
      color: 'bg-blue-600',
    },
    {
      icon: ArrowDownToLine,
      label: 'Deposit',
      sublabel: 'Add funds',
      onClick: () => setDepositOpen(true),
      color: 'bg-emerald-600',
    },
    {
      icon: PiggyBank,
      label: 'Savings',
      sublabel: 'Grow money',
      to: '/app/savings',
      color: 'bg-slate-800',
    },
    {
      icon: Clock,
      label: 'History',
      sublabel: 'All activity',
      to: '/app/transactions',
      color: 'bg-slate-600',
    },
  ];

  return (
    <motion.div
      className="space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Greeting */}
      <motion.div variants={itemVariants}>
        <h1
          className="text-xl font-bold text-slate-900"
          style={{ letterSpacing: '-0.02em' }}
        >
          {greeting()}, {user?.firstName ?? 'there'}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Here's what's happening with your Finx account.
        </p>
      </motion.div>

      {/* Balance card */}
      <motion.div variants={itemVariants}>
        <BalanceCard wallet={balance.data?.wallet} />
      </motion.div>

      {/* 4-button quick actions */}
      <motion.div
        className="grid grid-cols-4 gap-2 sm:gap-3"
        variants={containerVariants}
      >
        {quickActions.map(({ icon: Icon, label, sublabel, onClick, to, color }) => {
          const inner = (
            <div className="flex flex-col items-center gap-2 text-center">
              <div
                className={`grid h-11 w-11 place-items-center rounded-2xl ${color} text-white shadow-sm transition-transform duration-[140ms] active:scale-[0.93]`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{label}</p>
                <p className="text-[10px] text-slate-500">{sublabel}</p>
              </div>
            </div>
          );

          return (
            <motion.div key={label} variants={itemVariants}>
              {to ? (
                <Link
                  to={to}
                  className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-3.5 transition-all duration-[140ms] hover:border-slate-200 hover:shadow-[0_2px_12px_rgba(15,23,42,0.08)] active:scale-[0.97] sm:p-4"
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onClick}
                  className="flex w-full flex-col items-center rounded-2xl border border-slate-100 bg-white p-3.5 transition-all duration-[140ms] hover:border-slate-200 hover:shadow-[0_2px_12px_rgba(15,23,42,0.08)] active:scale-[0.97] sm:p-4"
                >
                  {inner}
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Modals */}
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} />

      {/* Quick stats row */}
      <motion.div className="grid grid-cols-3 gap-2 sm:gap-3" variants={containerVariants}>
        {[
          {
            icon: TrendingUp,
            iconBg: 'bg-emerald-50 text-emerald-600',
            label: 'Total deposited',
            value: formatMoney(totalDeposited.toString()),
          },
          {
            icon: PiggyBank,
            iconBg: 'bg-slate-100 text-slate-700',
            label: 'Total saved',
            value: formatMoney(savingsTotal.toString()),
          },
          {
            icon: ReceiptText,
            iconBg: 'bg-blue-50 text-blue-600',
            label: 'Transactions',
            value: `${txCount} recent`,
          },
        ].map(({ icon: Icon, iconBg, label, value }) => (
          <motion.div key={label} variants={itemVariants}>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl ${iconBg}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-[10px] leading-tight text-slate-500 sm:text-xs">{label}</p>
              </div>
              <p
                className="mt-2 truncate text-sm font-bold text-slate-900 sm:text-base"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {value}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* FinxTag share strip */}
      <motion.div variants={itemVariants}>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Your FinxTag</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Share it so friends can send you money instantly.
              </p>
              <p
                className="mt-2 font-mono text-sm font-bold text-blue-600"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                @{user?.finxTag ?? '---'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-[140ms] hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 active:scale-[0.96]"
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
      </motion.div>

      {/* Main content grid */}
      <motion.div
        className="grid gap-5 lg:grid-cols-[1fr_0.85fr]"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
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
                  .map((item) => (
                    <TransactionCard
                      key={item.id}
                      transaction={item}
                      onClick={() => setSelectedTransaction(item)}
                    />
                  ))
              ) : (
                <EmptyState
                  title="No activity yet"
                  description="Your deposits, transfers, and savings payouts will appear here."
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
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
                    <p className="text-center text-xs text-slate-400">
                      +{activePlans - 1} more active plan{activePlans - 1 > 1 ? 's' : ''}
                    </p>
                  )}
                </>
              ) : (
                <EmptyState
                  title="Start a plan"
                  description="Create a savings pocket and fund it from your wallet."
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
