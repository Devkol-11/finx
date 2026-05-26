import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, CheckCircle2, Info, Shield, Wallet, X, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { walletApi } from '@/features/wallet/api';
import { apiMessage, formatMoney } from '@/lib/utils';

const schema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Enter a valid amount')
});

const QUICK_AMOUNTS = ['5,000', '10,000', '25,000', '50,000', '100,000', '200,000'];

export function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '' }
  });

  const mutation = useMutation({
    mutationFn: walletApi.deposit,
    retry: 2,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet'] })
  });

  const setQuickAmount = (raw: string) => {
    form.setValue('amount', raw.replace(/,/g, ''), { shouldValidate: true });
  };

  const handleClose = () => {
    mutation.reset();
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-lg font-semibold text-gray-900">Fund wallet</DialogTitle>

        {mutation.isSuccess ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">Deposit successful</p>
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
            <div className="flex w-full gap-3">
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => {
                  mutation.reset();
                  form.reset();
                }}
              >
                Fund again
              </Button>
              <Button className="flex-1" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="space-y-4">
            {/* Info strip */}
            <div className="flex items-start gap-2 rounded-xl border border-primary-100 bg-primary-50 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
              <p className="text-xs text-primary-600">Deposits are processed instantly. No fees charged.</p>
            </div>

            {/* Amount input */}
            <div>
              <div className="mb-3 flex items-center gap-2">
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

            {/* Quick amounts */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Quick select</p>
              <div className="grid grid-cols-3 gap-2">
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

            {/* Trust signals */}
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-gray-600">Instant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-medium text-gray-600">Secure</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-primary-500" />
                <span className="text-xs font-medium text-gray-600">No fees</span>
              </div>
            </div>

            {/* Error */}
            {mutation.isError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs text-rose-600">{apiMessage(mutation.error)}</p>
              </div>
            )}

            {/* Submit */}
            <Button className="w-full" disabled={mutation.isPending} onClick={form.handleSubmit((values) => mutation.mutate(values))}>
              <ArrowDownToLine className="h-4 w-4" />
              {mutation.isPending ? 'Processing...' : 'Fund wallet'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
