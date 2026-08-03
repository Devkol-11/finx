import { Outlet } from 'react-router-dom';
import { ArrowRightLeft, PiggyBank, Wallet } from 'lucide-react';
import { Brand } from '@/components/layout/sidebar';

const features = [
  {
    icon: Wallet,
    label: 'Instant wallet',
    description: 'Fund in seconds',
  },
  {
    icon: ArrowRightLeft,
    label: 'Easy transfers',
    description: 'Send via FinxTag',
  },
  {
    icon: PiggyBank,
    label: 'Smart savings',
    description: 'Flexible or locked',
  },
];

export function AuthLayout() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      {/* Left panel */}
      <section
        className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between"
        style={{
          background: 'linear-gradient(145deg, #0a1f5c 0%, #1347d4 52%, #0693bf 100%)',
        }}
      >
        {/* Wave SVG background */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="auth-wave" x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse">
              <path
                d="M0,80 C26,53 53,107 80,80 C107,53 134,107 160,80"
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
              <path
                d="M0,120 C26,93 53,147 80,120 C107,93 134,147 160,120"
                fill="none"
                stroke="white"
                strokeWidth="0.6"
              />
              <path
                d="M0,40 C26,13 53,67 80,40 C107,13 134,67 160,40"
                fill="none"
                stroke="white"
                strokeWidth="0.6"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-wave)" />
        </svg>

        {/* Glow orbs */}
        <div
          className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-12 h-80 w-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }}
        />

        <div className="relative">
          <Brand onDark={true} />
        </div>

        <div className="relative max-w-xl">
          <h1
            className="text-5xl font-semibold text-white"
            style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}
          >
            A calmer way to move and grow money.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-blue-100/80">
            Finx keeps funding, transfers, savings, and transaction tracking in one lightweight place.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {features.map(({ icon: Icon, label, description }) => (
            <div
              key={label}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              <div className="mb-3 grid h-8 w-8 place-items-center rounded-xl bg-white/15">
                <Icon className="h-4 w-4 text-cyan-200" />
              </div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="mt-0.5 text-xs text-blue-100/65">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form panel */}
      <section className="flex min-h-screen flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand onDark={false} />
          </div>
          <Outlet />
        </div>
      </section>
    </main>
  );
}
