import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/common/form-field";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { walletApi } from "@/features/wallet/api";
import { apiMessage, formatMoney } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

const schema = z.object({
  finxTag: z.string().min(3, "FinxTag is too short").regex(/^[a-zA-Z0-9]+$/, "Use letters and numbers only"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Enter a valid amount"),
  narration: z.string().min(3, "Add a short narration").optional().or(z.literal("")),
});

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const draft = useUiStore((state) => state.transferDraft);
  const setDraft = useUiStore((state) => state.setTransferDraft);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: draft ?? { finxTag: "", amount: "", narration: "" },
  });
  const mutation = useMutation({
    mutationFn: walletApi.transfer,
    onSuccess: () => {
      setDraft(null);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
  const values = form.watch();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Send money" description="Transfer instantly to another Finx user with their FinxTag." />
      <Card className="p-6">
        {mutation.isSuccess ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
            <h2 className="mt-3 text-lg font-semibold">Transfer successful</h2>
            <p className="mt-1 text-sm">Sent {formatMoney(mutation.data.data.amount)} to @{mutation.data.data.receiver.finxTag}</p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((data) => {
              setDraft({ ...data, narration: data.narration || undefined });
              setConfirmOpen(true);
            })}
          >
            <FormField label="Recipient FinxTag" error={form.formState.errors.finxTag?.message}>
              <Input placeholder="adachukwu" {...form.register("finxTag")} />
            </FormField>
            <FormField label="Amount" error={form.formState.errors.amount?.message}>
              <Input inputMode="decimal" placeholder="25000" {...form.register("amount")} />
            </FormField>
            <FormField label="Narration" error={form.formState.errors.narration?.message}>
              <Textarea placeholder="Lunch, rent, savings..." {...form.register("narration")} />
            </FormField>
            {mutation.isError ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{apiMessage(mutation.error)}</p> : null}
            <Button className="w-full"><Send className="h-4 w-4" /> Review transfer</Button>
          </form>
        )}
      </Card>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogTitle className="text-xl font-semibold text-slate-950">Confirm transfer</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500">
            Send {formatMoney(values.amount)} to @{values.finxTag}. This posts immediately if your wallet has enough balance.
          </DialogDescription>
          <div className="mt-5 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button className="flex-1" disabled={mutation.isPending} onClick={() => mutation.mutate({ finxTag: values.finxTag, amount: values.amount, narration: values.narration || undefined })}>
              {mutation.isPending ? "Sending..." : "Send now"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
