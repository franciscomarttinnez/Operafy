# Demo seed

1. Sign up, complete onboarding, and run migration [`010_payment_update_and_seed.sql`](./migrations/010_payment_update_and_seed.sql).
2. Open **Settings** in the app and click **Load demo data**.

Creates 2 `[Demo]` customers, 1 accepted quote, 2 jobs (partial + unpaid), and 1 payment.

Safe to re-run: skips if any `[Demo]` customer already exists.
