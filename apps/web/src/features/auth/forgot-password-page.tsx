import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authApi } from "@/features/auth/api";

const schema = z.object({ email: z.email("Enter a valid email") });

export default function ForgotPasswordPage() {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const mutation = useMutation({ mutationFn: authApi.forgotPassword });
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold text-slate-950">Reset password</h1>
      <p className="mt-1 text-sm text-slate-500">We will send reset instructions if this account exists.</p>
      {mutation.isSuccess ? (
        <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-emerald-700">
          <MailCheck className="h-7 w-7" />
          <p className="mt-3 text-sm font-semibold">{mutation.data.message}</p>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input autoComplete="email" {...form.register("email")} />
          </FormField>
          <Button className="w-full" disabled={mutation.isPending}>{mutation.isPending ? "Sending..." : "Send reset link"}</Button>
        </form>
      )}
      <Link className="mt-5 inline-block text-sm font-semibold text-blue-700" to="/auth/login">Back to login</Link>
    </Card>
  );
}
