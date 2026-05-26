import { Mail, Tag } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { useAppSelector } from '@/store/hooks';
import { initials } from '@/lib/utils';

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your Finx identity and account details." />
      <Card className="p-6">
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.firstName} ${user.lastName}`}
              className="h-16 w-16 rounded-3xl bg-primary-50 object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary-50 text-xl font-bold text-primary-700">
              {initials(user?.firstName, user?.lastName)}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-slate-500">Finx account holder</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Info icon={Mail} label="Email" value={user?.email ?? ''} />
          <Info icon={Tag} label="FinxTag" value={`@${user?.finxTag ?? ''}`} />
        </div>
      </Card>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <Icon className="h-5 w-5 text-primary-600" />
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
