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
          onDark
            ? 'bg-white/20 ring-1 ring-white/25'
            : 'bg-gradient-to-b from-blue-500 to-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.35)]'
        )}
      >
        <span className="text-[13px] font-black tracking-tight text-white">FX</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <span
          className={cn(
            'text-[17px] font-black leading-none',
            onDark ? 'text-white' : 'text-slate-900'
          )}
          style={{ letterSpacing: '-0.03em' }}
        >
          Finx
        </span>
        <span
          className={cn(
            'text-[10px] font-bold uppercase',
            onDark ? 'text-white/55' : 'text-slate-400'
          )}
          style={{ letterSpacing: '0.14em' }}
        >
          Wallet &amp; Savings
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const dispatch = useAppDispatch();
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200/60 bg-white/90 p-5 backdrop-blur-xl xl:sticky xl:top-0 xl:flex xl:flex-col">
      <Brand onDark={false} />

      <nav className="mt-8 flex-1 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-[140ms]',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.32)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-3xl overflow-hidden">
        <div
          className="p-5 text-white"
          style={{
            background: 'linear-gradient(135deg, #0a1f5c 0%, #1347d4 60%, #0693bf 100%)',
          }}
        >
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Landmark className="h-4 w-4 text-cyan-200" />
          </div>
          <p className="mt-3 text-sm font-semibold leading-snug">
            Keep your wallet topped up for instant transfers.
          </p>
          <p className="mt-1.5 text-xs text-blue-100/70">
            Deposits, transfers, and savings in one clean ledger.
          </p>
        </div>
      </div>

      <Button className="mt-4 w-full" variant="ghost" onClick={() => dispatch(clearSession())}>
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </aside>
  );
}

export { nav };
