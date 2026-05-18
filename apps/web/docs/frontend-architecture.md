# Finx Web Architecture

Finx Web is a small React 19 + TypeScript + Vite app organized by product feature. It is a wallet, transfers, savings, and transaction tracking frontend hosted as a Vercel SPA.

## Local Workflow

Run these from `apps/web`:

- `pnpm dev` starts Vite locally.
- `pnpm build` runs TypeScript and creates the production build.
- `pnpm preview` serves the built app locally.

Vercel should use `apps/web` as the project root. `vercel.json` rewrites all browser routes to `index.html` so React Router refreshes work in production.

## Routing

React Router v7 uses nested route groups:

- `/auth/*` is public-only and redirects signed-in users to `/app/dashboard`.
- `/app/*` is protected and redirects anonymous users to `/auth/login`.
- `AppShell` owns the authenticated layout, desktop sidebar, mobile bottom nav, and page outlet.
- Pages are route-level lazy imports wrapped in `Suspense` with layout-matched skeletons.
- Unknown routes render the branded fintech 404 page.

## State Management

Redux Toolkit is intentionally small. It stores only the authenticated user, JWT token, bootstrap state, and first wallet returned during registration. It persists the session to `localStorage` and clears it on `401` responses.

TanStack Query owns server state:

- wallet balance and recent activity
- paginated transactions
- savings placeholder adapters
- deposit, withdrawal, and transfer mutations

Zustand owns lightweight UI state:

- selected transaction drawer/modal
- temporary transfer draft

Server data is never copied into Redux or Zustand.

## API Layer

`src/lib/api-client.ts` centralizes Axios configuration. It uses `VITE_API_URL`, appends `/api/v1`, injects the Bearer token, and clears the session on unauthorized responses. Only variables prefixed with `VITE_` are available to browser code.

Feature API modules live beside their UI:

- `features/auth/api.ts`
- `features/wallet/api.ts`
- `features/savings/mock-api.ts`

Savings and KYC currently use frontend placeholders because the current backend snapshot does not expose those route modules yet. Keep those adapters small so they can be replaced with real API calls later.

## Folder Structure

- `app/` providers, router, guards, route error handling
- `components/ui/` shadcn-style primitives
- `components/common/` reusable product cards, states, page headers, fields
- `components/layout/` shell, sidebar, mobile nav, auth layout
- `features/` route pages and feature API modules
- `store/` Redux session store and Zustand UI store
- `lib/` API client, query client, and utilities
- `docs/` short maintainer notes for backend-focused contributors
