# Operafy

**Customers → Quotes → Jobs → Payments** — one place for small service businesses.

Operafy is a browser SaaS that helps independent operators (HVAC, plumbing, cleaning, freelancers, and similar) stop juggling WhatsApp, spreadsheets, and paper quotes. It centralizes the everyday loop: who the customer is, what was quoted, whether the job is done, and what is still owed.

Built as a **finishable solo junior / student portfolio project**: real workflow, real multi-tenant security, careful money handling — without enterprise bloat.

---

## Who it is for

Owner-operators and tiny service businesses that need clarity, not an ERP.

Typical jobs:

- appliance / HVAC repair
- electricians and plumbers
- maintenance and cleaning
- freelancers selling services

The product stays **industry-agnostic**. MVP assumes **one owner ↔ one business**.

---

## The problem

Small service shops often track work across:

- chat threads
- spreadsheets
- paper quotes
- mental math for payments

That creates lost contacts, inconsistent pricing, unclear job status, and weak visibility into balances.

Operafy answers one question cleanly:

> What needs to be done, for whom, how much does it cost, and has it been paid?

---

## Core workflow

1. **Sign up** and create your business (organization)
2. **Add a customer**
3. **Create a quote** with line items and a correct total
4. Mark the quote **sent → accepted** (or rejected)
5. **Print** a clean quote to share
6. Turn an accepted quote into a **work order** (or create a job directly)
7. Move the job through statuses until **completed**
8. **Register payments** (including partial)
9. See **remaining balance** and simple **dashboard KPIs**

### Included in MVP

| Area | What you get |
|------|----------------|
| Auth | Sign up, sign in, sign out, password recovery |
| Organization | One business per user, settings, demo seed |
| Customers | CRUD, search, detail with related records |
| Quotes | Line items, statuses, totals, print view |
| Work orders | From quote or direct, status workflow |
| Payments | Partial payments, edit, balances |
| Dashboard | Pending quotes, active jobs, outstanding balance, today’s jobs |
| UX extras | EN/ES, light/dark, mobile-usable lists |

### Explicitly out of scope

Multi-org switching, invites/roles, inventory, public quote links, notifications/email automation, charts/reports, global search, audit logs, payment gateways, native apps.

Product intent and full scope live in [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md).  
Architecture “why / how” for interviews lives in [`GUIA_DEL_PROYECTO.md`](./GUIA_DEL_PROYECTO.md).

---

## Quick demo

1. `/signup` → create account  
2. `/onboarding` → create business  
3. Optional: **Settings → Load demo data** (needs migration `010`)  
4. Or: add a customer → draft quote → Mark sent → Mark accepted  
5. Quote detail → Create work order → register payment  
6. `/dashboard` → KPIs (many cards link into filtered lists)  
7. Toggle **EN/ES** and light/dark from the sidebar  

Demo seed details: [`supabase/SEED.md`](./supabase/SEED.md).

---

# For developers

Everything below is setup, stack, and project shape.

## Stack

| Layer | Choice |
|-------|--------|
| UI | React 19 + TypeScript (strict) + Vite |
| Routing | React Router |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS + shadcn-style / Radix primitives |
| Backend | Supabase (Auth, Postgres, RLS) |
| Deploy | Vercel (SPA rewrites in `vercel.json`) |
| Quality | Vitest, Oxlint, GitHub Actions CI |

## Architecture at a glance

```text
UI (pages / forms)
  → hooks (TanStack Query)
    → feature services (Supabase calls)
      → Postgres + RLS (+ security definer RPCs where needed)
```

- **Feature folders** under `src/features/*` (auth, customers, quotes, work-orders, payments, organizations, dashboard)
- **Shared** UI in `src/components`, helpers in `src/lib`, DB types in `src/types`
- **Tenant safety:** every org-owned row has `organization_id`; RLS is mandatory; client never uses the service-role key
- **Money:** integer minor units (e.g. `$205.50` → `20550`); totals/balances in `src/lib/money.ts`
- **Statuses:** explicit transition maps in feature helpers (quotes / work orders)

```text
src/
  components/     shared UI, layout, route guards
  features/       domain modules (pages, hooks, services, schemas)
  i18n/           EN/ES message catalogs
  theme/          light/dark
  lib/            supabase client, money, errors, env
  types/          Database typings
supabase/
  migrations/     SQL applied in order
```

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

1. Create a free Supabase project.
2. In the SQL editor, run these files **in order** (once each):

   - [`supabase/migrations/001_foundation.sql`](./supabase/migrations/001_foundation.sql)
   - [`supabase/migrations/004_customers_rpc.sql`](./supabase/migrations/004_customers_rpc.sql)
   - [`supabase/migrations/005_quotes.sql`](./supabase/migrations/005_quotes.sql)
   - [`supabase/migrations/006_security_hardening.sql`](./supabase/migrations/006_security_hardening.sql)
   - [`supabase/migrations/007_work_orders.sql`](./supabase/migrations/007_work_orders.sql)
   - [`supabase/migrations/008_payments.sql`](./supabase/migrations/008_payments.sql)
   - [`supabase/migrations/009_organization_settings.sql`](./supabase/migrations/009_organization_settings.sql)
   - [`supabase/migrations/010_payment_update_and_seed.sql`](./supabase/migrations/010_payment_update_and_seed.sql)
   - [`supabase/migrations/011_quote_delete_cleanup.sql`](./supabase/migrations/011_quote_delete_cleanup.sql)
   - [`supabase/migrations/012_clear_demo_and_wipe.sql`](./supabase/migrations/012_clear_demo_and_wipe.sql)

   Notes:

   - Do not re-run migrations that already succeeded.
   - `002` / `003` live under [`supabase/migrations/_obsolete/`](./supabase/migrations/_obsolete/) and are superseded by `004`.
   - If the project already has `001`–`011`, run **`012` once** for clear-demo + wipe-account RPCs.

3. **Authentication → URL Configuration**, add:

   - `http://localhost:5173/reset-password`
   - your production URL + `/reset-password`

4. **Authentication → Providers → Email**: for local demos, disabling email confirmation is simpler.

5. Copy `.env.example` → `.env.local`:

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

### 5. Deploy (Vercel)

1. Push to GitHub and import the project in [Vercel](https://vercel.com).
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Framework preset: Vite. `vercel.json` already rewrites SPA routes to `index.html`.
4. Add the production URL to Supabase Auth redirect URLs.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript project check |
| `npm run lint` | Oxlint |
| `npm run test` | Vitest (money + status transitions) |
| `npm run preview` | Preview production build |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, test, and build on `main`.

## Security (short)

- Tenant isolation enforced with **Postgres RLS** (not frontend filters alone)
- `profiles.organization_id` cannot be reassigned by the client (trigger + RPC GUC)
- Sensitive writes often go through **security definer** RPCs with explicit checks
- Money stored as **integer minor units**
- Org-owned tables include `organization_id` and RLS policies

## Testing philosophy

Tests protect credibility, not coverage vanity:

1. Quote totals (tax / discount)
2. Payment balance math
3. Status transition helpers

## Phase status

| Phase | Status | Scope |
|-------|--------|--------|
| 1 | Done | Auth, org onboarding, app shell |
| 2 | Done | Customers CRUD + search |
| 3 | Done | Quotes, line items, print view |
| 4 | Done | Work orders + status workflow |
| 5 | Done | Payments + balances + dashboard KPIs |
| 6+ | Done | Polish, filters, settings, demo seed, Vercel-ready |

---

**Honest scope:** a polished junior SaaS you can finish and defend — careful where money and tenancy matter, simple everywhere else.
