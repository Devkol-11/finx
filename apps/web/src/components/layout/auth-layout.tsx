import { Outlet } from 'react-router-dom';
import { Brand } from '@/components/layout/sidebar';

export function AuthLayout() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Brand />
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Wallets, transfers, savings</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-normal">A calmer way to move and grow money.</h1>
          <p className="mt-5 text-lg text-blue-50">
            Finx keeps funding, transfers, savings, and clean transaction tracking in one lightweight place.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {['Instant wallet', 'Easy transfers', 'Smart savings'].map((item) => (
            <div key={item} className="rounded-2xl bg-white/12 p-4 font-semibold backdrop-blur">
              {item}
            </div>
          ))}
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand onDark={true} />
          </div>
          <Outlet />
        </div>
      </section>
    </main>
  );
}
