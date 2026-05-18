import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/common/form-field";
import { authApi } from "@/features/auth/api";
import { apiMessage } from "@/lib/utils";
import { setSession } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ data }) => {
      dispatch(setSession(data));
      navigate((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/app/dashboard", { replace: true });
    },
  });

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold text-slate-950">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in to manage your wallet, savings, and transfers.</p>
      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Email" error={form.formState.errors.email?.message}>
          <Input autoComplete="email" placeholder="you@example.com" {...form.register("email")} />
        </FormField>
        <FormField label="Password" error={form.formState.errors.password?.message}>
          <Input autoComplete="current-password" type="password" placeholder="Enter password" {...form.register("password")} />
        </FormField>
        {mutation.isError ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{apiMessage(mutation.error)}</p> : null}
        <Button className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in..." : "Sign in"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link className="font-semibold text-blue-700" to="/auth/register">Create account</Link>
        <Link className="text-slate-500 hover:text-blue-700" to="/auth/forgot-password">Forgot password?</Link>
      </div>
    </Card>
  );
}
