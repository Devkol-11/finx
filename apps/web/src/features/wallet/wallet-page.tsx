import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { BalanceCard, TransactionCard } from '@/components/common/cards';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { walletApi } from '@/features/wallet/api';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const actions = [
  {
    to: '/app/wallet/deposit',
    icon: ArrowDownToLine,
    label: 'Deposit',
    sublabel: 'Add funds',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    to: '/app/transfers',
    icon: Send,
    label: 'Transfer',
    sublabel: 'Send via FinxTag',
    iconBg: 'bg-blue-50 text-blue-600',
  },
];

export default function WalletPage() {
  const balance = useQuery({ queryKey: ['wallet', 'balance'], queryFn: walletApi.balance });
  if (balance.isLoading) return <PageSkeleton />;
  if (balance.isError) return <ErrorState onRetry={() => balance.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet" description="Fund, withdraw, and monitor your Finx wallet." />

      {/* Large screen: balance + actions side by side */}
      <div className="hidden lg:flex lg:items-stretch lg:gap-4">
        <div className="flex-1">
          <BalanceCard wallet={balance.data?.wallet} />
        </div>
        <div className="flex flex-col justify-center gap-3">
          {actions.map(({ to, icon: Icon, label, sublabel, iconBg }) => (
            <motion.div
              key={to}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
            >
              <Link
                to={to}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all duration-[140ms] hover:border-blue-200 hover:shadow-[0_4px_16px_rgba(37,99,235,0.10)]"
              >
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-400">{sublabel}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Small screen: stacked */}
      <div className="space-y-3 lg:hidden">
        <BalanceCard wallet={balance.data?.wallet} />
        <div className="grid grid-cols-2 gap-3">
          {actions.map(({ to, icon: Icon, label, sublabel, iconBg }) => (
            <motion.div
              key={to}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.14, ease: EASE_OUT }}
            >
              <Link
                to={to}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-[140ms] hover:border-blue-200 hover:bg-blue-50/60"
              >
                <div className={`grid h-8 w-8 place-items-center rounded-xl ${iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-400">{sublabel}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallet activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {balance.data?.recentActivity.length ? (
            balance.data.recentActivity.map((item) => (
              <TransactionCard key={item.id} transaction={item} />
            ))
          ) : (
            <EmptyState
              title="No wallet activity"
              description="Fund your wallet to begin moving money."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
