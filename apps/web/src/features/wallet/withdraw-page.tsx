import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/common/form-field";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { walletApi } from "@/features/wallet/api";
import { apiMessage } from "@/lib/utils";

const schema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Enter a valid amount"),
  bankCode: z.string().min(2, "Bank code is required"),
  accountNumber: z.string().min(6, "Account number is required"),
  accountName: z.string().min(2, "Account name is required"),
  narration: z.string().optional(),
});

export default function WithdrawPage() {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { amount: "", bankCode: "", accountNumber: "", accountName: "", narration: "" } });
  const mutation = useMutation({ mutationFn: walletApi.withdraw, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wallet"] }) });
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Withdraw funds" description="Send money from your Finx wallet to a bank account." />
      <Card className="p-6">
        {mutation.isSuccess ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
            <h2 className="mt-3 text-lg font-semibold">Withdrawal completed</h2>
            <p className="mt-1 text-sm">Reference: {mutation.data.data.reference}</p>
          </div>
        ) : (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate({ ...values, narration: values.narration || undefined }))}>
            {(["amount", "bankCode", "accountNumber", "accountName"] as const).map((name) => (
              <FormField key={name} label={{ amount: "Amount", bankCode: "Bank code", accountNumber: "Account number", accountName: "Account name" }[name]} error={form.formState.errors[name]?.message}>
                <Input {...form.register(name)} />
              </FormField>
            ))}
            <div className="sm:col-span-2">
              <FormField label="Narration" error={form.formState.errors.narration?.message}>
                <Textarea {...form.register("narration")} />
              </FormField>
            </div>
            {mutation.isError ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">{apiMessage(mutation.error)}</p> : null}
            <Button className="sm:col-span-2" disabled={mutation.isPending}>{mutation.isPending ? "Processing..." : "Withdraw"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
