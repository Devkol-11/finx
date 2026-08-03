import { NavLink } from 'react-router-dom';
import { nav } from '@/components/layout/sidebar';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const mobileItems = nav.filter((item) =>
    ['/app/dashboard', '/app/transactions', '/app/savings', '/app/settings'].includes(item.to)
  );
  return (
    <nav className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-4 rounded-[22px] border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:inset-x-3 sm:bottom-3 xl:hidden">
      {mobileItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-1 text-[10px] font-semibold transition-all duration-[140ms] sm:text-[11px]',
              isActive
                ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.30)]'
                : 'text-slate-500 hover:text-slate-800'
            )
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
