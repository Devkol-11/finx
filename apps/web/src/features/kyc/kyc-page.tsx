import { useMutation } from '@tanstack/react-query';
import { AlertCircle, BadgeCheck, ChevronDown, FileSearch, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { kycApi } from '@/features/kyc/api';

const steps = [
  { icon: UserCheck, label: 'Submit your BVN' },
  { icon: FileSearch, label: 'Finx verifies instantly' },
  { icon: BadgeCheck, label: 'Verification confirmed' }
];

export default function KycPage() {
  const [bvn, setBvn] = useState('');

  const mutation = useMutation({
    mutationFn: (bvnInput: string) => kycApi.verifyBvn(bvnInput)
  });

  const isAlreadyVerified = mutation.isSuccess && mutation.data?.success === true && mutation.data?.alreadyVerified === true;

  const isVerified = mutation.isSuccess && mutation.data?.success === true && mutation.data?.alreadyVerified === false;

  const failed = mutation.isError;

  // ── Already verified screen ──
  if (isAlreadyVerified) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title="KYC verification" description="Verify your identity to unlock higher wallet limits and full access." />
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Identity already verified</h2>
              <p className="mt-0.5 text-sm text-gray-500">Your account was previously verified. No further action is needed.</p>
            </div>
            <div className="ml-auto shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">Verified</div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <BadgeCheck className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">You're already verified</p>
              <p className="mt-1 text-sm text-gray-500">
                Your identity has already been confirmed on Finx. Your wallet limits are fully unlocked and no further verification is required.
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

  // ── Fresh verification success screen ──
  if (isVerified) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title="KYC verification" description="Verify your identity to unlock higher wallet limits and full access." />
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Identity verified</h2>
              <p className="mt-0.5 text-sm text-gray-500">Your account is fully verified and has access to all Finx features.</p>
            </div>
            <div className="ml-auto shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">Verified</div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <BadgeCheck className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">You're all set</p>
              <p className="mt-1 text-sm text-gray-500">
                Your BVN has been verified successfully. Your wallet limits have been unlocked and your account is fully active.
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

  // ── Form screen ──
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="KYC verification" description="Verify your identity to unlock higher wallet limits and full access." />

      {/* ── Status card ── */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Identity verification required</h2>
            <p className="mt-0.5 text-sm text-gray-500">Complete the form below to verify your identity and unlock full wallet access.</p>
          </div>
          <div className="ml-auto shrink-0 rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-600">Pending</div>
        </div>
      </Card>

      {/* ── How it works ── */}
      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-gray-700">How verification works</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
          {steps.map((step, index) => (
            <div key={step.label} className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              <div className="relative flex items-center sm:w-full sm:justify-center">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
                  <step.icon className="h-4 w-4" />
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+18px)] top-1/2 hidden h-px w-[calc(100%-36px)] -translate-y-1/2 bg-gray-200 sm:block" />
                )}
              </div>
              <p className="text-xs text-gray-500 sm:mt-2 sm:px-2">{step.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Form ── */}
      <Card className="p-5">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(bvn);
          }}
        >
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700">Identity details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Select className="w-full appearance-none pr-9" disabled>
                  <option value="BVN">BVN — Bank Verification Number</option>
                </Select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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

          {/* ── Error state ── */}
          {failed && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div>
                <p className="text-xs font-semibold text-rose-600">Verification failed</p>
                <p className="mt-0.5 text-xs text-rose-500">We could not verify the BVN you provided. Please check the number and try again.</p>
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
              Your BVN is encrypted and stored securely. Finx will never share your identity details with third parties.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={bvn.length !== 11 || mutation.isPending}>
            <ShieldCheck className="h-4 w-4" />
            {mutation.isPending ? 'Verifying...' : 'Submit verification'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
