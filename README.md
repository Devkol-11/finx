# FINX

**Simple P2P money transfer and savings — built for real people, not accountants.**

FINX is a modern wallet app that makes sending money and saving effortless. No ledger jargon. No crypto complexity. Just fast, secure transfers and smart savings pockets(Currently mocked , real money flow coming soon...)

---

## What FINX Actually Does

- **Send money instantly** to anyone using a FinxTag (no account numbers needed)
- **Save your money** with flexible, locked, or goal-based savings plans
- **Track everything** in one clean dashboard — deposits, transfers, savings

That's it. No fluff.

---

## Tech Stack (For Developers)

### Backend

- Fastify + TypeScript
- Prisma + PostgreSQL
- Redis + BullMQ (for background jobs)

### Frontend

- React 19 + Vite
- TanStack Query (server state)
- Zustand (client state)
- Tailwind CSS + Radix UI

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Run database migrations
npx prisma migrate dev

# Start development server
pnpm dev
```
