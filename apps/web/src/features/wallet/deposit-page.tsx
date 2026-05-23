import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, CheckCircle2, Info, Shield, Wallet, X, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/common/form-field';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { walletApi } from '@/features/wallet/api';
import { apiMessage, formatMoney } from '@/lib/utils';

const schema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Enter a valid amount')
});

const QUICK_AMOUNTS = ['5,000', '10,000', '25,000', '50,000', '100,000', '200,000'];

export default function DepositPage() {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '' }
  });

  const mutation = useMutation({
    mutationFn: walletApi.deposit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet'] })
  });

  const setQuickAmount = (raw: string) => {
    form.setValue('amount', raw.replace(/,/g, ''), { shouldValidate: true });
  };

  // ── Success screen ──
  if (mutation.isSuccess) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title="Fund wallet" description="Add money to your Finx wallet instantly." />
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">Deposit successful</p>
              <p className="mt-1 text-sm text-gray-500">
                Your wallet has been funded with <span className="font-semibold text-gray-800">{formatMoney(form.getValues('amount'))}</span>
              </p>
            </div>
            <div className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Wallet className="h-4 w-4" />
                  <span>Status</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-semibold text-emerald-600">Posted</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Zap className="h-4 w-4" />
                  <span>Speed</span>
                </div>
                <span className="font-medium text-gray-700">Instant</span>
              </div>
            </div>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                mutation.reset();
                form.reset();
              }}
            >
              Fund again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Form screen ──
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Fund wallet" description="Add money to your Finx wallet instantly." />

      {/* ── Info strip ── */}
      <div className="flex items-start gap-2 rounded-xl border border-primary-100 bg-primary-50 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
        <p className="text-xs text-primary-600">
          Deposits are processed instantly and reflected in your available balance immediately. No fees are charged on deposits.
        </p>
      </div>

      <Card className="divide-y divide-gray-100">
        {/* ── Amount section ── */}
        <div className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-600">
              <ArrowDownToLine className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Enter amount</p>
          </div>

          <FormField label="Amount (NGN)" error={form.formState.errors.amount?.message}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">₦</span>
              <Input className="pl-7 text-lg font-semibold" inputMode="decimal" placeholder="0.00" {...form.register('amount')} />
            </div>
          </FormField>
        </div>

        {/* ── Quick amounts ── */}
        <div className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Quick select</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setQuickAmount(amt)}
                className="rounded-xl border border-gray-200 bg-white px-2 py-2.5 text-center text-xs font-semibold text-gray-700 transition-all duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 active:scale-95"
              >
                ₦{amt}
              </button>
            ))}
          </div>
        </div>

        {/* ── Trust signals ── */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Instant</p>
                <p className="text-[10px] text-gray-400">Reflects immediately</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Secure</p>
                <p className="text-[10px] text-gray-400">256-bit encrypted</p>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600">
                <Wallet className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">No fees</p>
                <p className="text-[10px] text-gray-400">100% goes to wallet</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="p-5">
          {mutation.isError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p className="text-xs text-rose-600">{apiMessage(mutation.error)}</p>
            </div>
          )}
          <Button className="w-full" disabled={mutation.isPending} onClick={form.handleSubmit((values) => mutation.mutate(values))}>
            <ArrowDownToLine className="h-4 w-4" />
            {mutation.isPending ? 'Processing...' : 'Fund wallet'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
