import { Settings } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Brand, Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setKycVerified } from '@/store/auth-slice';
import { kycApi } from '@/features/kyc/api';
import { initials } from '@/lib/utils';

export function AppShell() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();

  const { data: kycStatus } = useQuery({
    queryKey: ['kyc', 'status'],
    queryFn: kycApi.getStatus,
    enabled: !!user,
    staleTime: Infinity
  });

  useEffect(() => {
    if (kycStatus?.verified !== undefined) {
      dispatch(setKycVerified(kycStatus.verified));
    }
  }, [kycStatus, dispatch]);

  return (
    <div className="min-h-screen xl:flex">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-24 xl:pb-0">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            {/* Brand - visible only on mobile */}
            <div className="xl:hidden">
              <Brand onDark={false} />
            </div>

            <div className="ml-auto flex items-center gap-3">
              {/* Settings button - tablet only (hidden on mobile since MobileNav handles it) */}
              <Button asChild className="hidden md:flex xl:hidden" size="icon" variant="ghost" aria-label="Open settings">
                <Link to="/app/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>

              {/* User profile - hidden on mobile, visible on md+ */}
              <div className="hidden items-center gap-3 md:flex">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-950">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500">@{user?.finxTag}</p>
                </div>
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="h-10 w-10 rounded-2xl bg-primary-50 object-cover ring-2 ring-slate-100"
                  />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-50 text-sm font-bold text-primary-700">
                    {initials(user?.firstName, user?.lastName)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
