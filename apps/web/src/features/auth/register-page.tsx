import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authApi } from '@/features/auth/api';
import { apiMessage } from '@/lib/utils';
import { setSession } from '@/store/auth-slice';
import { useAppDispatch } from '@/store/hooks';

const schema = z.object({
  firstName: z.string().min(2, 'First name is too short'),
  lastName: z.string().min(2, 'Last name is too short'),
  email: z.email('Enter a valid email'),
  phoneNumber: z.string().optional(),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/[0-9]/, 'Add a number')
    .regex(/[^A-Za-z0-9]/, 'Add a special character'),
});

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', phoneNumber: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ data }) => {
      ``;
      dispatch(
        setSession({
          token: data.accessToken,
          user: data.user,
          wallet: data.wallet,
        })
      );
      navigate('/app/dashboard', { replace: true });
    },
  });

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold text-slate-950">Create your Finx account</h1>
      <p className="mt-1 text-sm text-slate-500">A wallet and FinxTag are created automatically.</p>
      <form
        className="mt-6 grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({ ...values, phoneNumber: values.phoneNumber || undefined })
        )}
      >
        <FormField label="First name" error={form.formState.errors.firstName?.message}>
          <Input {...form.register('firstName')} />
        </FormField>
        <FormField label="Last name" error={form.formState.errors.lastName?.message}>
          <Input {...form.register('lastName')} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input autoComplete="email" {...form.register('email')} />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label="Phone number" error={form.formState.errors.phoneNumber?.message}>
            <Input placeholder="+234..." {...form.register('phoneNumber')} />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label="Password" error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('password')} />
          </FormField>
        </div>
        {mutation.isError ? (
          <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">
            {apiMessage(mutation.error)}
          </p>
        ) : null}
        <Button className="sm:col-span-2" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating account...' : 'Create account'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <p className="mt-5 text-sm text-slate-500">
        Already have an account?{' '}
        <Link className="font-semibold text-blue-700" to="/auth/login">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
