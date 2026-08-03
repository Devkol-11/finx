import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { AlertCircle, BadgeCheck, FileSearch, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { kycApi } from '@/features/kyc/api';
import { useAppSelector } from '@/store/hooks';
import { setKycVerified } from '@/store/auth-slice';

const steps = [
  { icon: UserCheck, label: 'Submit your BVN' },
  { icon: FileSearch, label: 'Finx verifies instantly' },
  { icon: BadgeCheck, label: 'Verification confirmed' },
];

function VerifiedScreen({ alreadyVerified = false }: { alreadyVerified?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="KYC verification"
        description="Verify your identity to unlock higher wallet limits and full access."
      />
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {alreadyVerified ? 'Identity already verified' : 'Identity verified'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {alreadyVerified
                ? 'Your account was previously verified. No further action is needed.'
                : 'Your account is fully verified and has access to all Finx features.'}
            </p>
          </div>
          <div className="ml-auto shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200/60">
            Verified
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div
            className="grid h-16 w-16 place-items-center rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
          >
            <BadgeCheck className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">
              {alreadyVerified ? "You're already verified" : "You're all set"}
            </p>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500">
              {alreadyVerified
                ? 'Your identity has already been confirmed on Finx. No further verification is required.'
                : 'Your BVN has been verified successfully. Your wallet limits have been unlocked.'}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2">
            <BadgeCheck className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-semibold text-emerald-600">KYC verification complete</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function KycPage() {
  const [bvn, setBvn] = useState('');
  const dispatch = useDispatch();

  const kycVerified = useAppSelector((state) => state.auth.user?.kycVerified ?? false);

  const mutation = useMutation({
    mutationFn: (bvnInput: string) => kycApi.verifyBvn(bvnInput),
    onSuccess: (data) => {
      if (data.success) {
        dispatch(setKycVerified(true));
      }
    },
  });

  const wasAlreadyVerified =
    kycVerified && mutation.isSuccess && mutation.data?.alreadyVerified === true;

  if (kycVerified && wasAlreadyVerified) return <VerifiedScreen alreadyVerified />;
  if (kycVerified) return <VerifiedScreen />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="KYC verification"
        description="Verify your identity to unlock higher wallet limits and full access."
      />

      {/* Status card */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Identity verification required</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Complete the form below to verify your identity and unlock full wallet access.
            </p>
          </div>
          <div className="ml-auto shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-200/60">
            Pending
          </div>
        </div>
      </Card>

      {/* How it works */}
      <Card className="p-5">
        <p className="mb-5 text-sm font-semibold text-slate-700">How verification works</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-0">
          {steps.map((step, i) => (
            <div
              key={step.label}
              className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center"
            >
              <div className="relative flex items-center sm:w-full sm:justify-center">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  }}
                >
                  <step.icon className="h-4 w-4" />
                </div>
                {i < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+20px)] top-1/2 hidden h-px w-[calc(100%-40px)] -translate-y-1/2 bg-slate-200 sm:block" />
                )}
              </div>
              <p className="text-xs text-slate-500 sm:mt-2.5 sm:px-2">{step.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* BVN form */}
      <Card className="p-5">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(bvn);
          }}
        >
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-700">Identity details</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-500" />
                <span className="text-sm font-medium text-slate-600">BVN</span>
                <span className="text-xs text-slate-400">Bank Verification Number</span>
              </div>
              <Input
                placeholder="Enter your 11-digit BVN"
                value={bvn}
                inputMode="numeric"
                maxLength={11}
                onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          </div>

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div>
                <p className="text-xs font-semibold text-rose-600">Verification failed</p>
                <p className="mt-0.5 text-xs text-rose-500">
                  We could not verify the BVN you provided. Please check the number and try again.
                </p>
                <button
                  type="button"
                  className="mt-1.5 text-xs font-semibold text-rose-600 underline underline-offset-2"
                  onClick={() => mutation.reset()}
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <p className="text-xs text-blue-600">
              Your BVN is encrypted and stored securely. Finx will never share your identity details
              with third parties.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={bvn.length !== 11 || mutation.isPending}
          >
            <ShieldCheck className="h-4 w-4" />
            {mutation.isPending ? 'Verifying...' : 'Submit verification'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
