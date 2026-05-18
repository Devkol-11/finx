import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { SavingsCard } from "@/components/common/cards";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/common/states";
import { PageHeader } from "@/components/common/page-header";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { savingsApi } from "@/features/savings/mock-api";

const schema = z.object({
  name: z.string().min(3, "Name is too short"),
  targetAmount: z.coerce.number().positive("Enter a target"),
  lockDurationDays: z.coerce.number().int().min(1, "Choose a lock duration"),
  frequency: z.enum(["Daily", "Weekly", "Monthly"]),
});

export default function SavingsPage() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ["savings", "plans"], queryFn: savingsApi.listPlans });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", targetAmount: 0, lockDurationDays: 90, frequency: "Weekly" },
  });
  const mutation = useMutation({
    mutationFn: savingsApi.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings", "plans"] });
      setOpen(false);
      form.reset();
    },
  });

  if (plans.isLoading) return <PageSkeleton />;
  if (plans.isError) return <ErrorState onRetry={() => plans.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings"
        description="Create target-based savings pockets with simple lock durations and progress tracking."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New savings</Button>}
      />
      <section className="grid gap-4 sm:grid-cols-3">
        <CardStat label="Active plans" value={`${plans.data?.length ?? 0}`} />
        <CardStat label="Total saved" value={plans.data?.reduce((sum, plan) => sum + plan.savedAmount, 0).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }) ?? "NGN 0"} />
        <CardStat label="Goal focus" value="Locked and target savings" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.data?.length ? (
          plans.data.map((plan) => (
            <Link key={plan.id} to={`/app/savings/${plan.id}`} className="block transition hover:-translate-y-0.5">
              <SavingsCard plan={plan} />
            </Link>
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState title="No savings yet" description="Create a target savings pocket for rent, emergencies, or a planned purchase." />
          </div>
        )}
      </section>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="text-xl font-semibold text-slate-950">Create savings pocket</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-500">
            Set a goal, duration, and saving frequency.
          </DialogDescription>
          <form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <FormField label="Name" error={form.formState.errors.name?.message}>
              <Input placeholder="Emergency pocket" {...form.register("name")} />
            </FormField>
            <FormField label="Target amount" error={form.formState.errors.targetAmount?.message}>
              <Input inputMode="decimal" {...form.register("targetAmount")} />
            </FormField>
            <FormField label="Lock duration" error={form.formState.errors.lockDurationDays?.message}>
              <Select {...form.register("lockDurationDays", { valueAsNumber: true })}>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
              </Select>
            </FormField>
            <FormField label="Frequency" error={form.formState.errors.frequency?.message}>
              <Select {...form.register("frequency")}>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </Select>
            </FormField>
            <Button className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create savings"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
      <p className="text-xs font-semibold uppercase text-blue-700">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
