# Demo seed

1. Sign up, complete onboarding, and run migrations through [`012_clear_demo_and_wipe.sql`](./migrations/012_clear_demo_and_wipe.sql).
2. Open **Settings** in the app:
   - **Load demo data** — creates `[Demo]` sample rows
   - **Remove demo data** — deletes only `[Demo]` rows
   - **Delete all data** — wipes customers / quotes / jobs / payments (keeps login + business profile)

Creates 2 `[Demo]` customers, 1 accepted quote, 2 jobs (partial + unpaid), and 1 payment.

Safe to re-run load: skips if any `[Demo]` customer already exists.
