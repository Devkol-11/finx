import { useDispatch } from 'react-redux';
import { LogOut, Mail, ShieldCheck, Sparkles, CheckCircle2, ChevronRight, Tag } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppSelector } from '@/store/hooks';
import { clearSession, setAvatarUrl } from '@/store/auth-slice';
import { initials } from '@/lib/utils';

const buildAvatarUrl = () =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${Math.random().toString(36).substring(2, 10)}`;

export default function SettingsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [justRegenerated, setJustRegenerated] = useState(false);

  const handleRegenerate = () => {
    dispatch(setAvatarUrl(buildAvatarUrl()));
    setJustRegenerated(true);
    setTimeout(() => setJustRegenerated(false), 2500);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" description="Manage your Finx profile and account preferences." />

      {/* Profile card */}
      <Card className="overflow-hidden p-0">
        {/* Banner */}
        <div
          className="relative h-28 w-full overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0a1f5c 0%, #1347d4 52%, #0693bf 100%)',
          }}
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern id="settings-wave" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <path
                  d="M0,60 C20,40 40,80 60,60 C80,40 100,80 120,60"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#settings-wave)" />
          </svg>
        </div>

        <div className="px-5 pb-6">
          {/* Avatar row */}
          <div className="-mt-11 mb-5 flex items-end justify-between">
            <div className="relative">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Your avatar"
                  className="h-20 w-20 rounded-3xl object-cover ring-4 ring-white shadow-lg"
                />
              ) : (
                <div
                  className="grid h-20 w-20 place-items-center rounded-3xl text-2xl font-bold text-white ring-4 ring-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                >
                  {initials(user?.firstName, user?.lastName)}
                </div>
              )}
              <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>

            <button
              onClick={handleRegenerate}
              className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-[140ms] hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.97]"
            >
              <Sparkles className="h-4 w-4 text-blue-500 transition-transform duration-200 group-hover:rotate-12" />
              New look
            </button>
          </div>

          {/* Name block */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                className="text-xl font-bold text-slate-950"
                style={{ letterSpacing: '-0.02em' }}
              >
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-slate-500">@{user?.finxTag}</p>
            </div>
            {user?.kycVerified && (
              <div className="mt-1 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 ring-1 ring-emerald-200/60">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-600">Verified</span>
              </div>
            )}
          </div>

          {justRegenerated && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-xs font-semibold text-blue-700">Fresh look unlocked!</p>
            </div>
          )}
        </div>
      </Card>

      {/* Account details */}
      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">Account details</p>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
          <DetailRow
            icon={Mail}
            label="Email address"
            value={user?.email ?? '--'}
            accent="bg-blue-50 text-blue-600"
          />
          <DetailRow
            icon={Tag}
            label="FinxTag"
            value={`@${user?.finxTag ?? '--'}`}
            accent="bg-violet-50 text-violet-600"
          />
        </div>
      </Card>

      {/* Verification */}
      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">Verification</p>
        <div
          className={`flex items-center gap-4 rounded-2xl p-4 ${
            user?.kycVerified
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50'
              : 'bg-gradient-to-r from-amber-50 to-orange-50/60'
          }`}
        >
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
              user?.kycVerified
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-amber-100 text-amber-600'
            }`}
          >
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-950">KYC verification</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {user?.kycVerified
                ? 'Identity confirmed. Full wallet access unlocked.'
                : 'Verify your identity to unlock full wallet access.'}
            </p>
          </div>
          <div
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              user?.kycVerified
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {user?.kycVerified ? 'Verified' : 'Pending'}
          </div>
        </div>

        {!user?.kycVerified && (
          <div className="mt-4">
            <Button className="w-full" onClick={() => navigate('/app/kyc')}>
              Complete verification
            </Button>
          </div>
        )}
      </Card>

      {/* Sign out */}
      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">Account</p>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-950">Sign out</p>
            <p className="mt-0.5 text-xs text-slate-500">
              You'll need to log back in to access your account.
            </p>
          </div>
          <Button variant="danger" size="sm" className="shrink-0" onClick={() => dispatch(clearSession())}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white px-4 py-3.5">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-950">{value}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </div>
  );
}
