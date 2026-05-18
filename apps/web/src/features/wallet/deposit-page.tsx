import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/common/form-field";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { walletApi } from "@/features/wallet/api";
import { apiMessage } from "@/lib/utils";

const schema = z.object({ amount: z.string().regex(/^\d+(\.\d+)?$/, "Enter a valid amount") });

export default function DepositPage() {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { amount: "" } });
  const mutation = useMutation({
    mutationFn: walletApi.deposit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wallet"] }),
  });
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Fund wallet" description="Initialize a secure fiat deposit session." />
      <Card className="p-6">
        {mutation.isSuccess ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
            <h2 className="mt-3 text-lg font-semibold">Deposit initialized</h2>
            <p className="mt-1 text-sm">{mutation.data.message}</p>
            {"authorizationUrl" in mutation.data.data && mutation.data.data.authorizationUrl ? (
              <Button asChild className="mt-4"><a href={mutation.data.data.authorizationUrl}>Continue payment</a></Button>
            ) : null}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <FormField label="Amount" error={form.formState.errors.amount?.message}>
              <Input inputMode="decimal" placeholder="50000" {...form.register("amount")} />
            </FormField>
            {mutation.isError ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{apiMessage(mutation.error)}</p> : null}
            <Button disabled={mutation.isPending}>{mutation.isPending ? "Initializing..." : "Initialize deposit"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
