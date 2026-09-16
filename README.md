# Operafy

SaaS web app for small service businesses: customers → quotes → jobs → payments.

Built as a **solo junior portfolio project** with a finishable MVP scope.

## Stack

- React + TypeScript + Vite
- React Router
- TanStack Query
- Tailwind CSS + shadcn-style UI
- Supabase (Auth, Postgres, RLS)
- Zod + React Hook Form

## Phases

| Phase | Status | Scope |
|-------|--------|--------|
| 1 | Done | Auth, org onboarding, app shell |
| 2 | Done | Customers CRUD + search |
| 3 | Done | Quotes, line items, print view |
| 4 | Done | Work orders + status workflow |
| 5 | Done | Payments + balances + dashboard KPI |
| 6 | Done | UI polish, ConfirmDialog, cleanup |

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

1. Create a free Supabase project.
2. Open the SQL editor and run these files **in order** (only once each, unless re-running an idempotent fix):
   - [`supabase/migrations/001_foundation.sql`](./supabase/migrations/001_foundation.sql)
   - [`supabase/migrations/004_customers_rpc.sql`](./supabase/migrations/004_customers_rpc.sql)
   - [`supabase/migrations/005_quotes.sql`](./supabase/migrations/005_quotes.sql)
   - [`supabase/migrations/006_security_hardening.sql`](./supabase/migrations/006_security_hardening.sql)
   - [`supabase/migrations/007_work_orders.sql`](./supabase/migrations/007_work_orders.sql)
   - [`supabase/migrations/008_payments.sql`](./supabase/migrations/008_payments.sql)

   Notes:
   - You do **not** need to re-run old migrations that already succeeded.
   - `002` / `003` live under [`supabase/migrations/_obsolete/`](./supabase/migrations/_obsolete/) and are superseded by `004`.
   - If your project already ran `001`–`007`, run **`008` once** for payments.
3. In **Authentication → URL Configuration**, add `http://localhost:5173/reset-password` (and your production URL) to Redirect URLs.
4. In **Authentication → Providers → Email**, decide whether confirmations are required (for local demos, disabling confirmation is simpler).
5. Copy `.env.example` to `.env.local` and fill:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Use the **anon/public** key only. Never put the service-role key in the frontend.

### 3. Run

```bash
npm run dev
```

### 4. Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Demo walkthrough

1. `/signup` → create account  
2. `/onboarding` → create business  
3. `/customers` → add a customer  
4. `/quotes/new` → draft quote with line items → Mark sent → Mark accepted  
5. Quote detail → Create work order  
6. Work order → Register payment (partial or full)  
7. `/dashboard` → confirm KPIs (customers, open quotes, active jobs, outstanding)  
8. Toggle EN/ES and light/dark from the sidebar  

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript project build check |
| `npm run lint` | Oxlint |
| `npm run test` | Vitest (money + status transitions) |

## Security notes

- Tenant isolation is enforced with Postgres RLS.
- `profiles.organization_id` cannot be reassigned by the client (trigger + RPC GUC).
- Quote / work-order / payment / customer writes go through `security definer` RPCs where needed.
- Money is stored as integer minor units.
- All business tables include `organization_id` and RLS policies.
