import { Search, Settings } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { Brand, Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/store/hooks";
import { initials } from "@/lib/utils";

export function AppShell() {
  const user = useAppSelector((state) => state.auth.user);
  return (
    <div className="min-h-screen xl:flex">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-24 xl:pb-0">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="xl:hidden">
              <Brand />
            </div>
            <div className="hidden flex-1 md:block xl:ml-0">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="h-10 pl-9" placeholder="Search transactions, plans, references" />
              </div>
            </div>
            <Button asChild className="ml-auto xl:hidden" size="icon" variant="ghost" aria-label="Open settings">
              <Link to="/app/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <div className="hidden items-center gap-3 md:flex">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-950">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-slate-500">@{user?.finxTag}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
                {initials(user?.firstName, user?.lastName)}
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
