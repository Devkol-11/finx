import { NavLink } from "react-router-dom";
import { nav } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const mobileItems = nav.filter((item) => ["/app/dashboard", "/app/wallet", "/app/transfers", "/app/transactions", "/app/savings"].includes(item.to));
  return (
    <nav className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-5 rounded-3xl border border-slate-200 bg-white/95 p-1.5 shadow-xl shadow-slate-300/30 backdrop-blur sm:inset-x-3 sm:bottom-3 sm:p-2 xl:hidden">
      {mobileItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold transition sm:text-[11px]",
              isActive ? "bg-blue-50 text-blue-700" : "text-slate-500",
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
