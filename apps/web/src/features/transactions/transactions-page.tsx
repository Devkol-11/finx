import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { TransactionCard } from '@/components/common/cards';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { walletApi } from '@/features/wallet/api';
import { formatDate, formatMoney } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const selected = useUiStore((state) => state.selectedTransaction);
  const setSelected = useUiStore((state) => state.setSelectedTransaction);
  const query = useQuery({
    queryKey: ['wallet', 'transactions', page],
    queryFn: () => walletApi.transactions({ page, limit: 10, currency: 'NGN' }),
  });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const totalPages = query.data?.pagination.totalPages || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Wallet activity including deposits, withdrawals, and transfers."
      />

      <div className="space-y-2">
        {query.data?.items.length ? (
          query.data.items.map((item) => (
            <TransactionCard key={item.id} transaction={item} onClick={() => setSelected(item)} />
          ))
        ) : (
          <EmptyState
            title="No transactions found"
            description="Start by funding your wallet to see activity here."
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Page {query.data?.pagination.page ?? 1} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((v) => v - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage((v) => v + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogTitle className="text-xl font-semibold text-slate-950" style={{ letterSpacing: '-0.02em' }}>
            Transaction details
          </DialogTitle>
          {selected && (
            <DialogDescription asChild>
              <div className="mt-4 space-y-2 text-sm">
                <Row label="Amount" value={formatMoney(selected.amount, selected.currency)} />
                <Row label="Type" value={selected.type.replaceAll('_', ' ')} />
                <Row label="Status" value={selected.status} />
                <Row label="Reference" value={selected.reference ?? 'Not available'} />
                <Row label="Date" value={formatDate(selected.createdAt)} />
              </div>
            </DialogDescription>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-950 tabular-nums">{value}</span>
    </div>
  );
}
