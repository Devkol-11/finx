import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, CreditCard, Send } from "lucide-react";
import { BalanceCard, MetricCard, TransactionCard } from "@/components/common/cards";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/common/states";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { walletApi } from "@/features/wallet/api";
import { formatMoney } from "@/lib/utils";

export default function WalletPage() {
  const balance = useQuery({ queryKey: ["wallet", "balance"], queryFn: walletApi.balance });
  if (balance.isLoading) return <PageSkeleton />;
  if (balance.isError) return <ErrorState onRetry={() => balance.refetch()} />;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Fund, withdraw, and monitor your Finx wallet."
        action={<Button asChild><Link to="/app/wallet/deposit"><ArrowDownToLine className="h-4 w-4" /> Deposit</Link></Button>}
      />
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <BalanceCard wallet={balance.data?.wallet} />
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Available" value={formatMoney(balance.data?.wallet.availableBalance)} icon={CreditCard} />
          <Button asChild className="h-auto min-h-28 flex-col rounded-2xl" variant="secondary"><Link to="/app/wallet/withdraw"><ArrowUpFromLine className="h-5 w-5" /> Withdraw</Link></Button>
          <Button asChild className="h-auto min-h-28 flex-col rounded-2xl" variant="secondary"><Link to="/app/transfers"><Send className="h-5 w-5" /> Transfer</Link></Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Wallet activity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {balance.data?.recentActivity.length ? balance.data.recentActivity.map((item) => <TransactionCard key={item.id} transaction={item} />) : <EmptyState title="No wallet activity" description="Fund your wallet to begin moving money." />}
        </CardContent>
      </Card>
    </div>
  );
}
