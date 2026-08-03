import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-xl skeleton-shimmer", className)}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-56 w-full rounded-3xl" />
      <div className="grid gap-3 grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-5 py-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50">
        <Inbox className="h-6 w-6 text-blue-500" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function ErrorState({
  title = "Something didn't load",
  description = "Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-5 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-100">
        <AlertTriangle className="h-6 w-6 text-rose-500" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">{description}</p>
      {onRetry && (
        <Button className="mt-5" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}
