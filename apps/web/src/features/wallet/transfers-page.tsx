import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Info, Send, User, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/common/form-field';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { walletApi } from '@/features/wallet/api';
import { apiMessage, formatMoney } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

const schema = z.object({
  finxTag: z
    .string()
    .min(3, 'FinxTag is too short')
    .regex(/^[a-zA-Z0-9]+$/, 'Use letters and numbers only'),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Enter a valid amount'),
  narration: z.string().min(3, 'Add a short narration').optional().or(z.literal(''))
});

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const setDraft = useUiStore((state) => state.setTransferDraft);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { finxTag: '', amount: '', narration: '' }
  });

  const values = form.watch();

  const mutation = useMutation({
    mutationFn: walletApi.transfer,
    onSuccess: () => {
      setDraft(null);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    }
  });

  const handleReview = form.handleSubmit((data) => {
    setDraft({ ...data, narration: data.narration || undefined });
    setConfirmOpen(true);
  });

  const handleClose = () => {
    setConfirmOpen(false);
  };

  const handleSend = () => {
    mutation.mutate({
      finxTag: values.finxTag,
      amount: values.amount,
      narration: values.narration || undefined
    });
  };

  // ── Success screen ──
  if (mutation.isSuccess) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title="Send money" description="Transfer instantly to another Finx user with their FinxTag." />
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">Transfer successful</p>
              <p className="mt-1 text-sm text-gray-500">
                You sent <span className="font-semibold text-gray-800">{formatMoney(mutation.data.data.amount)}</span> to{' '}
                <span className="font-semibold text-gray-800">@{mutation.data.data.receiver.finxTag}</span>
              </p>
            </div>

            {/* ── Transfer summary strip ── */}
            <div className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Wallet className="h-4 w-4" />
                  <span>New balance</span>
                </div>
                <span className="font-semibold text-gray-900">{formatMoney(mutation.data.data.senderBalance)}</span>
              </div>
              {mutation.data.data.receiver.email && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <User className="h-4 w-4" />
                    <span>Recipient</span>
                  </div>
                  <span className="font-medium text-gray-700">{mutation.data.data.receiver.email}</span>
                </div>
              )}
            </div>

            <Button
              className="mt-2 w-full"
              variant="secondary"
              onClick={() => {
                mutation.reset();
                form.reset();
              }}
            >
              Send another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Form screen ──
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Send money" description="Transfer instantly to another Finx user with their FinxTag." />

      {/* ── Info strip ── */}
      <div className="flex items-start gap-2 rounded-xl border border-primary-100 bg-primary-50 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
        <p className="text-xs text-primary-600">
          Transfers to other Finx users are instant and free. Make sure the FinxTag is correct before sending — transactions cannot be reversed.
        </p>
      </div>

      <Card className="divide-y divide-gray-100">
        {/* ── Recipient section ── */}
        <div className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-600">
              <User className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Recipient</p>
          </div>
          <FormField label="FinxTag" error={form.formState.errors.finxTag?.message}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">@</span>
              <Input className="pl-7" placeholder="adachukwu" autoComplete="off" {...form.register('finxTag')} />
            </div>
          </FormField>
        </div>

        {/* ── Amount section ── */}
        <div className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-600">
              <Wallet className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Amount</p>
          </div>
          <FormField label="Amount (NGN)" error={form.formState.errors.amount?.message}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">₦</span>
              <Input className="pl-7" inputMode="decimal" placeholder="0.00" {...form.register('amount')} />
            </div>
          </FormField>
        </div>

        {/* ── Narration section ── */}
        <div className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-600">
              <Send className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Narration</p>
          </div>
          <FormField label="What's this for? (optional)" error={form.formState.errors.narration?.message}>
            <Textarea placeholder="Lunch, rent, savings..." {...form.register('narration')} />
          </FormField>
        </div>

        {/* ── Submit ── */}
        <div className="p-5">
          {mutation.isError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p className="text-xs text-rose-600">{apiMessage(mutation.error)}</p>
            </div>
          )}
          <Button type="button" className="w-full" onClick={() => handleReview()}>
            <span>Review transfer</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* ── Confirm dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold text-gray-900">Confirm transfer</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-3 space-y-3">
              {/* Amount highlight */}
              <div className="rounded-2xl bg-primary-50 py-4 text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-primary-400">You are sending</p>
                <p className="mt-1 text-3xl font-bold text-primary-700">{formatMoney(values.amount)}</p>
              </div>

              {/* Details */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">To</span>
                  <span className="font-semibold text-gray-900">@{values.finxTag}</span>
                </div>
                {values.narration && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Note</span>
                    <span className="font-medium text-gray-700">{values.narration}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Fee</span>
                  <span className="font-semibold text-emerald-600">Free</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">This posts immediately. Transactions cannot be reversed.</p>
            </div>
          </DialogDescription>

          <div className="mt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={mutation.isPending} onClick={handleSend}>
              {mutation.isPending ? 'Sending...' : 'Send now'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
