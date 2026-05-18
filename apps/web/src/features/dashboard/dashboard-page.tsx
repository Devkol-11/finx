import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDownToLine, PiggyBank, ReceiptText, Send } from "lucide-react";
import { BalanceCard, MetricCard, SavingsCard, TransactionCard } from "@/components/common/cards";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { walletApi } from "@/features/wallet/api";
import { savingsApi } from "@/features/savings/mock-api";
import { formatMoney } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

export default function DashboardPage() {
  const balance = useQuery({ queryKey: ["wallet", "balance"], queryFn: walletApi.balance });
  const savings = useQuery({ queryKey: ["savings", "plans"], queryFn: savingsApi.listPlans });
  const setSelectedTransaction = useUiStore((state) => state.setSelectedTransaction);

  if (balance.isLoading) return <PageSkeleton />;
  if (balance.isError) return <ErrorState onRetry={() => balance.refetch()} />;

  const savingsTotal = savings.data?.reduce((sum, plan) => sum + plan.savedAmount, 0) ?? 0;
  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <BalanceCard wallet={balance.data?.wallet} />
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label="Saved value" value={formatMoney(savingsTotal)} icon={PiggyBank} />
          <MetricCard label="Recent activity" value={`${balance.data?.recentActivity.length ?? 0} items`} icon={ReceiptText} />
          <Button asChild className="h-auto min-h-24 flex-col rounded-2xl">
            <Link to="/app/wallet/deposit"><ArrowDownToLine className="h-5 w-5" /> Fund wallet</Link>
          </Button>
          <Button asChild className="h-auto min-h-24 flex-col rounded-2xl" variant="secondary">
            <Link to="/app/transfers"><Send className="h-5 w-5" /> Send money</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/app/transactions">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {balance.data?.recentActivity.length ? balance.data.recentActivity.map((item) => (
              <TransactionCard key={item.id} transaction={item} onClick={() => setSelectedTransaction(item)} />
            )) : <EmptyState title="No activity yet" description="Your deposits, withdrawals, transfers, and savings payouts will appear here." />}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Savings overview</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link to="/app/savings">Open</Link></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {savings.data?.[0] ? <SavingsCard plan={savings.data[0]} /> : <EmptyState title="Start a plan" description="Create a target savings pocket and fund it from your Finx wallet." />}
            </CardContent>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-950">Wallet rhythm</p>
            <p className="mt-2 text-sm text-slate-500">
              Keep everyday spending in your wallet and move planned money into savings pockets when you are ready.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Button asChild variant="secondary"><Link to="/app/savings">Open savings</Link></Button>
              <Button asChild variant="ghost"><Link to="/app/transactions">View activity</Link></Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
