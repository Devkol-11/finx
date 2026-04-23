# FINX

FINX: A high-integrity, ledger-based Fintech platform for seamless Fiat-to-Crypto wealth management.

## Overview

FINX is designed as a production-minded fintech platform where balances are not treated as mutable guesses, but as outcomes derived from a controlled ledger system. The platform is built to support regulated-style financial flows across fiat transfers, provider-backed deposits and withdrawals, strategy-driven investments, and future crypto asset operations.

The system emphasizes correctness, auditability, and extensibility. Every financial movement is intended to be traceable, every service boundary is explicit, and every module is structured for long-term maintainability in a multi-product SaaS environment.

## System Architecture

### Monorepo Structure

FINX is organized as a monorepo to support shared standards, reusable packages, and coordinated delivery across backend and frontend applications.

Typical workspace structure:

- `apps/api`: Fastify + TypeScript backend services
- `apps/web`: React + Vite frontend application
- `packages/shared`: Shared contracts, utilities, and reusable primitives

This structure keeps domain logic close to the owning application while still allowing common abstractions to be promoted into shared packages over time.

### Layered Architecture

The backend follows a strict layered architecture:

- `Controller`: Handles HTTP transport concerns and response shaping
- `Service`: Contains business orchestration and domain rules
- `Repository`: Encapsulates persistence, transactional writes, and read models

This separation allows FINX to preserve clean architectural boundaries, simplify testing, and prevent transport logic from leaking into financial workflows.

### Double-Entry Ledger

FINX is ledger-first. Wallet balances are cached for performance, but the ledger remains the financial source of truth.

Key characteristics:

- Every economic event is represented as a ledger transaction
- Debit and credit entries are recorded as balanced journal movements
- Shared references tie related entries together for auditability
- Balance-sensitive operations are executed within database transactions to preserve consistency

This model supports reconciliation, historical tracing, provider dispute resolution, and future accounting-grade reporting.

## Core Modules

### Auth

The Auth module provides secure user onboarding and session access controls.

Capabilities include:

- Secure registration flows with wallet bootstrapping
- Argon2-based password hashing
- JWT-based session management using Bearer tokens
- Password reset initiation and token-based credential recovery
- Zod-validated request contracts shared across route and service layers

### Wallet

The Wallet module manages financial movement across internal users and external rails.

Capabilities include:

- Atomic peer-to-peer transfers using FinxTag identifiers
- Ledger-backed balance handling with transactional updates
- Fiat deposit and withdrawal orchestration via provider interfaces
- Future-ready blockchain provider abstractions for crypto operations
- Paginated transaction history from ledger records

### Investments

The Investment module uses a strategy-pattern model to support multiple plan behaviors without hardcoding plan rules into the service layer.

Capabilities include:

- Strategy-driven plan definitions and payout policies
- Wallet-to-investment fund movement with ledger consistency
- Portfolio visibility for active and matured positions
- Background-worker friendly payout orchestration
- Extensible support for additional products and term structures

## Technical Stack

### Backend

- Fastify
- TypeScript
- Prisma
- PostgreSQL

### Infrastructure

- Redis
- BullMQ for scheduled jobs such as interest payout processing

### Frontend

- React
- Vite
- TanStack Query
- Zustand

## Key Engineering Concepts

### Atomicity

All money movements are wrapped in ACID-compliant database transactions. This ensures that balance updates, ledger creation, and domain state changes either succeed together or fail together.

### Precision

FINX avoids floating-point arithmetic for financial operations. Monetary workflows are modeled with Decimal types to preserve deterministic value handling across transfers, accruals, payouts, and reconciliations.

### Security

Security is enforced at the platform edge and within core services.

Key controls include:

- `@fastify/helmet` for hardened HTTP headers
- Route and global rate limiting for abuse resistance
- Zod-based edge validation for request bodies, params, and querystrings
- JWT authentication for protected flows
- Argon2 password hashing for credential storage

## Setup Instructions

Install dependencies:

```bash
pnpm install
```

Run database migrations:

```bash
npx prisma migrate
```

Start the development environment:

```bash
pnpm dev
```

## Roadmap

Planned platform evolution includes:

- Crypto infrastructure integration for EVM-compatible deposits, withdrawals, and on-chain settlement workflows
- Automated behavioral risk analysis for suspicious transaction monitoring, fraud heuristics, and compliance-aware activity scoring
- Expanded reconciliation, treasury, and reporting capabilities for institutional-grade operations
