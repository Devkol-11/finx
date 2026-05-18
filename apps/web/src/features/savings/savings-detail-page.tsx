import { useQuery } from "@tanstack/react-query";
import { CalendarClock, LockKeyhole, Repeat2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/common/states";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { savingsApi } from "@/features/savings/mock-api";
import { formatDate, formatMoney } from "@/lib/utils";

export default function SavingsDetailPage() {
  const { id = "" } = useParams();
  const plan = useQuery({ queryKey: ["savings", "plan", id], queryFn: () => savingsApi.getPlan(id) });
  const activity = useQuery({ queryKey: ["savings", "activity", id], queryFn: () => savingsApi.listActivity(id) });

  if (plan.isLoading || activity.isLoading) return <PageSkeleton />;
  if (plan.isError || !plan.data) return <ErrorState onRetry={() => plan.refetch()} />;

  const progress = plan.data.targetAmount > 0 ? Math.min(100, Math.round((plan.data.savedAmount / plan.data.targetAmount) * 100)) : 0;
  return (
    <div className="space-y-6">
      <PageHeader
        title={plan.data.name}
        description={plan.data.description}
        action={<Button asChild variant="secondary"><Link to="/app/savings">Back to savings</Link></Button>}
      />
      <Card className="p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Saved amount</p>
            <h2 className="mt-2 break-words text-3xl font-semibold text-slate-950 sm:text-4xl">{formatMoney(plan.data.savedAmount)}</h2>
            <p className="mt-2 text-sm text-slate-500">Target {formatMoney(plan.data.targetAmount)}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{progress}% complete</span>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
        </div>
      </Card>
      <section className="grid gap-4 md:grid-cols-3">
        <Info icon={LockKeyhole} label="Lock duration" value={`${plan.data.lockDurationDays} days`} />
        <Info icon={CalendarClock} label="Maturity date" value={formatDate(plan.data.maturityDate)} />
        <Info icon={Repeat2} label="Frequency" value={plan.data.frequency} />
      </section>
      <Card className="p-5">
        <h2 className="text-base font-semibold text-slate-950">Recent savings activity</h2>
        <div className="mt-4 space-y-3">
          {activity.data?.length ? activity.data.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{item.description}</p>
                <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
              </div>
              <p className="text-sm font-semibold text-emerald-600">+{formatMoney(item.amount)}</p>
            </div>
            )) : <EmptyState title="No savings activity" description="Deposits into this pocket will appear here." />}
        </div>
      </Card>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof LockKeyhole; label: string; value: string }) {
  return (
    <Card className="p-5">
      <Icon className="h-5 w-5 text-blue-600" />
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </Card>
  );
}
