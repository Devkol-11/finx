import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CalendarClock, LockKeyhole, PiggyBank, Plus, Sparkles, Target, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states';
import { PageHeader } from '@/components/common/page-header';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { savingsApi, type SavingsPlan, type SavingsPlanType } from '@/features/savings/api';
import { formatMoney } from '@/lib/utils';

type PlanTypeConfig = {
  icon: React.ElementType;
  label: string;
  description: string;
  gradient: string;
  iconBg: string;
};

const planTypeConfig: Record<string, PlanTypeConfig> = {
  FLEXIBLE: {
    icon: Zap,
    label: 'Flexible',
    description: 'Deposit and withdraw anytime, no restrictions',
    gradient: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-emerald-50 text-emerald-600'
  },
  LOCKED: {
    icon: LockKeyhole,
    label: 'Locked',
    description: 'Commit funds until a set unlock date',
    gradient: 'from-rose-500 to-orange-400',
    iconBg: 'bg-rose-50 text-rose-600'
  },
  TARGET: {
    icon: Target,
    label: 'Target',
    description: 'Save toward a specific financial goal',
    gradient: 'from-blue-600 to-cyan-500',
    iconBg: 'bg-blue-50 text-blue-600'
  }
};

const PLAN_TYPES: SavingsPlanType[] = ['FLEXIBLE', 'LOCKED', 'TARGET'];

const schema = z
  .object({
    type: z.enum(['FLEXIBLE', 'LOCKED', 'TARGET']),
    name: z.string().min(2, 'Name is too short').max(100),
    description: z.string().max(500).optional(),
    targetAmount: z.string().optional(),
    unlockDate: z.string().optional(),
    locked: z.boolean().optional()
  })
  .refine((d) => d.type !== 'TARGET' || !!d.targetAmount, {
    path: ['targetAmount'],
    message: 'Target amount is required for TARGET plans.'
  })
  .refine((d) => d.type !== 'LOCKED' || !!d.unlockDate, {
    path: ['unlockDate'],
    message: 'Unlock date is required for LOCKED plans.'
  });

type FormValues = z.infer<typeof schema>;

function PlanCard({ plan }: { plan: SavingsPlan }) {
  const config = planTypeConfig[plan.type] ?? planTypeConfig['FLEXIBLE'];
  const Icon = config.icon;

  // 🔥 FIX: Safe number conversion with NaN guard
  const currentAmountNum = (() => {
    const num = parseFloat(plan.currentAmount);
    return isNaN(num) ? 0 : num;
  })();

  const targetAmountNum = (() => {
    if (!plan.targetAmount) return null;
    const num = parseFloat(plan.targetAmount);
    return isNaN(num) ? null : num;
  })();

  const progress = targetAmountNum !== null && targetAmountNum > 0 ? Math.min(100, Math.round((currentAmountNum / targetAmountNum) * 100)) : null;

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    MATURED: 'bg-blue-50 text-blue-600 border-blue-100',
    CANCELLED: 'bg-red-50 text-red-500 border-red-100',
    PAUSED: 'bg-gray-100 text-gray-500 border-gray-200'
  };

  return (
    <Link
      to={`/app/savings/${plan.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg"
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradient}`} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-2xl ${config.iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{plan.name}</p>
              {plan.description && <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{plan.description}</p>}
            </div>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              statusColors[plan.status] ?? 'bg-gray-100 text-gray-500 border-gray-200'
            }`}
          >
            {plan.status}
          </span>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{plan.type === 'TARGET' ? 'Saved so far' : 'Balance'}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(plan.currentAmount)}</p>
          {plan.targetAmount && targetAmountNum !== null && targetAmountNum > 0 && (
            <p className="mt-0.5 text-xs text-gray-400">of {formatMoney(plan.targetAmount)} goal</p>
          )}
        </div>

        {progress !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{progress}% complete</span>
              <span>{100 - progress}% remaining</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-700`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {plan.unlockDate && (
          <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2">
            <CalendarClock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">
              Unlocks{' '}
              {new Date(plan.unlockDate).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function SavingsPage() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SavingsPlanType>('FLEXIBLE');
  const queryClient = useQueryClient();

  const plans = useQuery({
    queryKey: ['savings', 'plans'],
    queryFn: savingsApi.listPlans
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'FLEXIBLE', name: '', description: '' }
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      savingsApi.createPlan({
        ...values,
        currency: 'NGN',
        type: values.type as SavingsPlanType,
        unlockDate: values.unlockDate ? new Date(values.unlockDate).toISOString() : undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'plans'] });
      setOpen(false);
      form.reset();
      setSelectedType('FLEXIBLE');
    }
  });

  if (plans.isLoading) return <PageSkeleton />;
  if (plans.isError) return <ErrorState onRetry={() => plans.refetch()} />;

  // 🔥 FIX: Safe totalSaved calculation with NaN guard
  const totalSaved = (() => {
    if (!plans.data?.length) return 0;
    return plans.data.reduce((sum, p) => {
      const amount = parseFloat(p.currentAmount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  })();

  const activePlans = plans.data?.filter((p) => p.status === 'ACTIVE').length ?? 0;
  const targetPlans = plans.data?.filter((p) => p.type === 'TARGET') ?? [];

  // 🔥 FIX: Safe overallProgress calculation - no division by zero, no NaN
  const overallProgress = (() => {
    if (targetPlans.length === 0) return null;

    let validProgressSum = 0;
    let validPlanCount = 0;

    for (const p of targetPlans) {
      if (p.targetAmount) {
        const current = parseFloat(p.currentAmount);
        const target = parseFloat(p.targetAmount);

        if (!isNaN(current) && !isNaN(target) && target > 0) {
          const pct = (current / target) * 100;
          validProgressSum += pct;
          validPlanCount++;
        }
      }
    }

    if (validPlanCount === 0) return null;
    return Math.round(validProgressSum / validPlanCount);
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings"
        description="Create and manage your savings pockets — flexible, locked, or goal-based."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New plan
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 p-4 text-white">
          <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/20">
            <PiggyBank className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs font-medium text-blue-100">Total saved</p>
          <p className="mt-0.5 truncate text-lg font-bold">{formatMoney(totalSaved.toString())}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 text-white">
          <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs font-medium text-emerald-100">Active plans</p>
          <p className="mt-0.5 text-lg font-bold">{activePlans}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white">
          <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/20">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs font-medium text-purple-100">Goal progress</p>
          <p className="mt-0.5 text-lg font-bold">{overallProgress !== null ? `${overallProgress}%` : '—'}</p>
        </div>
      </div>

      {/* Plans grid */}
      {plans.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.data.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : (
        <Card className="p-10">
          <EmptyState title="No savings plans yet" description="Create a flexible, locked, or goal-based savings pocket to get started." />
        </Card>
      )}

      {/* Create plan dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold text-gray-900">New savings plan</DialogTitle>
          <DialogDescription className="mt-0.5 text-sm text-gray-500">Choose a plan type and configure your savings goal.</DialogDescription>

          <form className="mt-4 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            {/* Plan type selector */}
            <div>
              <div className="grid grid-cols-3 gap-2">
                {PLAN_TYPES.map((type) => {
                  const config = planTypeConfig[type];
                  const Icon = config.icon;
                  const active = selectedType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSelectedType(type);
                        form.setValue('type', type);
                      }}
                      className={`relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-150 ${
                        active ? 'border-transparent ring-2 ring-primary-400' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {active && <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-10`} />}
                      <div className={`relative grid h-7 w-7 place-items-center rounded-lg ${config.iconBg}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <p className="relative mt-2 text-xs font-bold text-gray-900">{config.label}</p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">{planTypeConfig[selectedType].description}</p>
            </div>

            <FormField label="Plan name" error={form.formState.errors.name?.message}>
              <Input placeholder="e.g. Emergency fund" {...form.register('name')} />
            </FormField>

            <FormField label="Description (optional)" error={form.formState.errors.description?.message}>
              <Input placeholder="What is this savings for?" {...form.register('description')} />
            </FormField>

            {selectedType === 'TARGET' && (
              <FormField label="Target amount (NGN)" error={form.formState.errors.targetAmount?.message}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₦</span>
                  <Input className="pl-7" inputMode="decimal" placeholder="750000" {...form.register('targetAmount')} />
                </div>
              </FormField>
            )}

            {selectedType === 'LOCKED' && (
              <FormField label="Unlock date" error={form.formState.errors.unlockDate?.message}>
                <Input type="datetime-local" {...form.register('unlockDate')} />
              </FormField>
            )}

            {mutation.isError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs text-rose-600">Something went wrong. Please try again.</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create plan'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
