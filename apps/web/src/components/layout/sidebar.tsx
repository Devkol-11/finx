import { NavLink } from 'react-router-dom';
import { BadgeCheck, Home, Landmark, LogOut, PiggyBank, ReceiptText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearSession } from '@/store/auth-slice';
import { useAppDispatch } from '@/store/hooks';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/app/dashboard', label: 'Dashboard', icon: Home },
  { to: '/app/transactions', label: 'Activity', icon: ReceiptText },
  { to: '/app/savings', label: 'Savings', icon: PiggyBank },
  { to: '/app/settings', label: 'Settings', icon: Settings }
];

export function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]',
          onDark ? 'bg-white/20 ring-1 ring-white/30' : 'bg-blue-600 shadow-md shadow-blue-200'
        )}
      >
        <span className={cn('text-[13px] font-black tracking-tight', onDark ? 'text-white' : 'text-white')}>FX</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className={cn('text-[17px] font-black leading-none tracking-[-0.03em]', onDark ? 'text-white' : 'text-slate-900')}>Finx</span>
        <div className="flex items-center gap-1.5">
          <span className={cn('text-[10px] font-bold uppercase tracking-[0.14em]', onDark ? 'text-white/60' : 'text-slate-400')}>
            Wallet & Savings
          </span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const dispatch = useAppDispatch();
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white/80 p-5 backdrop-blur xl:sticky xl:top-0 xl:block">
      <Brand onDark={false} />

      <nav className="mt-9 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition',
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 rounded-3xl bg-blue-950 p-5 text-white">
        <Landmark className="h-5 w-5 text-cyan-200" />
        <p className="mt-3 text-sm font-semibold">Finx works best when your wallet stays funded.</p>
        <p className="mt-1 text-xs text-blue-100">Deposits, transfers, and savings stay in one clean ledger.</p>
      </div>

      <Button className="mt-6 w-full" variant="ghost" onClick={() => dispatch(clearSession())}>
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </aside>
  );
}

export { nav };
