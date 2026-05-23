import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { BalanceCard, TransactionCard } from '@/components/common/cards';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { walletApi } from '@/features/wallet/api';

const actionButtonClass =
  'group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3.5 shadow-sm transition-colors duration-200 hover:border-primary-300 hover:bg-primary-50 active:bg-primary-100';

const actionIconClass =
  'flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors duration-200 group-hover:bg-primary-100 group-hover:text-primary-600';

export default function WalletPage() {
  const balance = useQuery({ queryKey: ['wallet', 'balance'], queryFn: walletApi.balance });
  if (balance.isLoading) return <PageSkeleton />;
  if (balance.isError) return <ErrorState onRetry={() => balance.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet" description="Fund, withdraw, and monitor your Finx wallet." />

      {/* ── Large screen layout ── */}
      <div className="hidden lg:flex lg:items-stretch lg:gap-4">
        <div className="flex-1">
          <BalanceCard wallet={balance.data?.wallet} />
        </div>
        <div className="flex flex-col justify-center gap-3">
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
            <Link to="/app/wallet/deposit" className={actionButtonClass}>
              <div className={actionIconClass}>
                <ArrowDownToLine className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Deposit</p>
                <p className="text-xs text-gray-400">Add funds</p>
              </div>
            </Link>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
            <Link to="/app/transfers" className={actionButtonClass}>
              <div className={actionIconClass}>
                <Send className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Transfer</p>
                <p className="text-xs text-gray-400">Send via FinxTag</p>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ── Small screen layout ── */}
      <div className="space-y-3 lg:hidden">
        <BalanceCard wallet={balance.data?.wallet} />
        <div className="grid grid-cols-2 gap-3">
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
            <Link
              to="/app/wallet/deposit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors duration-200 hover:border-primary-300 hover:bg-primary-50 active:bg-primary-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors group-hover:bg-primary-100 group-hover:text-primary-600">
                <ArrowDownToLine className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Deposit</p>
                <p className="text-xs text-gray-400">Add funds</p>
              </div>
            </Link>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
            <Link
              to="/app/transfers"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors duration-200 hover:border-primary-300 hover:bg-primary-50 active:bg-primary-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <Send className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Transfer</p>
                <p className="text-xs text-gray-400">Send via FinxTag</p>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallet activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {balance.data?.recentActivity.length ? (
            balance.data.recentActivity.map((item) => <TransactionCard key={item.id} transaction={item} />)
          ) : (
            <EmptyState title="No wallet activity" description="Fund your wallet to begin moving money." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
