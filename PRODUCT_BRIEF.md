# Operafy — Product Brief

## 1. Product Overview

**Product name:** Operafy

**Product type:** SaaS web application (browser-based, responsive)

**Primary purpose:**  
Operafy helps small service businesses manage customers, quotes, jobs, and payments in one place.

It should feel like a clean, professional business tool — not a toy CRUD app, and not an enterprise ERP.

**Project intent:**  
A credible portfolio / learning project for a **solo junior or student developer**, completable in roughly **4–8 weeks** of focused part-time work (not months).

---

# 2. Problem

Small service businesses often juggle:

- WhatsApp
- spreadsheets
- paper quotes
- manual calculations
- informal payment tracking

That leads to lost customer info, inconsistent quotes, unclear job status, and poor visibility into what is owed.

Operafy centralizes the core loop: **customer → quote → job → payment**.

---

# 3. Target Users

Independent professionals and small service businesses, for example:

- HVAC / appliance repair
- electricians / plumbers
- maintenance / cleaning
- freelancers offering services

Keep the product **industry-agnostic**. Do not hardcode one trade.

For MVP, assume a **single owner-operator** using the app (not a large team with complex permissions).

---

# 4. Core Value Proposition

**Customer → Quote → Job (work order) → Payment**

Core question the product answers:

> What needs to be done, for whom, how much does it cost, and has it been paid?

---

# 5. Product Philosophy

Prioritize:

1. Simplicity
2. Clarity
3. Reliability
4. Clean UI
5. Real business workflow
6. Solid basics (auth, tenancy, money, statuses)

Avoid:

- feature bloat
- enterprise complexity
- premature abstractions
- “nice to have” systems that take weeks alone

**Quality bar:** polished junior SaaS — defendable in an interview, finishable by one person.

---

# 6. Solo-Dev Constraints (important)

This project is intentionally scoped for **one developer**.

### Do

- Ship one clear workflow end-to-end
- Prefer simple, readable code over clever architecture
- Use Supabase Auth + Postgres + RLS (real multi-tenant security)
- Keep money logic correct and centralized
- Make the UI usable on desktop and mobile

### Do not (MVP)

- Multi-organization switching / invites / team management
- Complex role/permission matrices
- Inventory / materials catalog / stock
- Public customer quote approval links
- Global search
- Reports / analytics charts
- Notifications / email automation
- Activity/audit log tables
- Native mobile apps / PWA as a requirement
- Microservices, event buses, or custom backends beyond Supabase

If a feature is impressive but delays finishing the core loop, **cut it**.

---

# 7. MVP Scope

## Authentication

- Sign up
- Sign in
- Sign out
- Password recovery (Supabase built-in)

Optional later: simple profile edit (name). Not required to “complete” MVP.

---

## Organization / Business

On signup (or first login), the user creates **one** business/organization.

**MVP model (keep it simple):**

- one user owns one organization
- all business data is scoped by `organization_id`
- RLS enforces tenant isolation

Organization fields (keep minimal):

- name
- phone
- email
- address (optional)
- default currency (e.g. `USD`, `ARS`)

Skip for MVP unless easy:

- logo upload
- tax ID
- timezone management
- multi-org memberships
- inviting employees

---

# 8. Dashboard

Simple landing page after login. **No charts required.**

Show a few KPI numbers, for example:

- pending quotes
- active jobs
- outstanding balance (sum of unpaid amounts)
- jobs scheduled today (if scheduled_date exists)

Optional small lists:

- today’s jobs
- recent quotes (last 5)

Do **not** build quote/job pipeline boards, activity feeds, or analytics in MVP.

---

# 9. Customers

Core entity.

Fields:

- id
- organization_id
- name (single display name is fine; first/last optional split if preferred)
- phone
- email
- address
- notes
- created_at
- updated_at

### List

- search by name/phone/email (simple `ilike`)
- basic sorting (e.g. newest first)
- simple pagination **or** a reasonable page size limit

### Detail

- customer info
- related quotes
- related jobs
- related payments

No activity timeline required.

---

# 10. Quotes

Most important feature after customers.

Fields:

- id
- organization_id
- customer_id
- quote_number (simple sequential per org, or human-readable string)
- title
- notes (optional)
- status
- subtotal
- tax_amount (optional, default 0)
- discount_amount (optional, default 0)
- total
- created_at
- updated_at

Skip for MVP unless trivial:

- expiration dates + auto-expire logic
- long legal terms templates
- versioning

### Line items

Free-text priced rows (no materials catalog):

- description
- quantity
- unit_price (minor units)
- line_total (minor units)

Example:

| Item | Qty | Price | Total |
|------|-----|-------|-------|
| Labor | 1 | 90000 | 90000 |
| Part replacement | 1 | 35000 | 35000 |
| **Total** | | | **125000** |

Money is always stored as **integer minor units**.

---

# 11. Quote Status

Keep a small, explicit set:

- `draft`
- `sent`
- `accepted`
- `rejected`

Allowed transitions (example):

- draft → sent
- sent → accepted
- sent → rejected
- draft → rejected (optional cancel-from-draft)

Do not implement `expired` automation or complex status graphs.

Accepted quote can be converted into a work order (one-click / one action).

---

# 12. Quote PDF / Print

Users need something professional to share with a customer.

**MVP approach (pick the simplest that looks good):**

- print-friendly quote page (`window.print`) **or**
- simple PDF generation with a lightweight library

Must include:

- business name/contact
- customer info
- quote number / date
- line items
- totals

Logo is optional. Perfect pixel design is not required — clean and readable is enough.

---

# 13. Work Orders (Jobs)

A work order is the job to perform.

Primary path: create from an **accepted** quote.

Also allow creating a job directly for a customer (no quote), with an explicit `billable_amount`.

Fields:

- id
- organization_id
- customer_id
- quote_id (optional)
- title
- description (optional)
- scheduled_date (optional)
- status
- billable_amount (required when no quote; otherwise derived from quote total)
- notes
- created_at
- updated_at
- completed_at (nullable)

Skip for MVP:

- employee assignment
- materials/labor breakdown on the job
- calendar/scheduling UI beyond a date field
- recurring jobs

---

# 14. Work Order Status

- `pending`
- `scheduled`
- `in_progress`
- `completed`
- `cancelled`

Primary path:

`pending` → `scheduled` → `in_progress` → `completed`

Cancellation allowed from non-completed states.

Keep transition rules in a small domain function — not scattered in UI.

---

# 15. Payments

Payments belong to a customer and usually to a work order.

Fields:

- id
- organization_id
- customer_id
- work_order_id
- amount (minor units)
- method (`cash` | `transfer` | `card` | `other`)
- paid_at
- notes (optional)

Support **partial payments**.

Outstanding balance is derived:

```text
balance = billable_total - sum(payments)
```

Where `billable_total` comes from the linked quote total, or from `work_orders.billable_amount` when there is no quote.

Do not build invoices, payment gateways, or accounting exports.

---

# 16. Explicitly Out of Scope (this project version)

Do not implement or “half-design” these unless the core MVP is done and time remains:

- materials / inventory / SKUs
- public quote acceptance links
- multi-user orgs, invites, roles (admin/employee)
- org switcher / multiple businesses per user
- notifications, reminders, email sending
- reports and charts
- global search
- audit/activity log system
- file uploads (beyond maybe a logo later)
- native apps

---

# 17. Multi-Tenancy & Security

Operafy is multi-tenant:

- every business row has `organization_id`
- users only access their organization’s data
- **Supabase RLS is mandatory**

Never rely only on frontend filtering.

Validate inputs with a schema library (e.g. Zod).  
Prefer database constraints for integrity.  
Keep secrets out of the client. Never expose the service-role key in the browser.

For money: store integers; compute totals in a shared domain function; do not trust free-typed floats in the UI.

---

# 18. Technology Direction

Keep the stack small and common:

### Frontend

- React
- TypeScript (strict)
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- shadcn/ui (Radix under the hood)

### Backend / infra

- Supabase (Postgres, Auth, RLS)
- Vercel for deploy

### Avoid adding unless clearly needed

- Recharts (no charts in MVP)
- custom Node API
- complex state managers (Redux, Zustand) unless pain appears
- heavy PDF frameworks if print CSS is enough

---

# 19. Design & UX

Feel: modern, clean, trustworthy, business-oriented.

Avoid: visual noise, glassmorphism, excessive animation, dashboard clutter.

Every important screen should handle:

1. Loading
2. Empty
3. Success
4. Error

Empty states should tell the user the next action.

Destructive actions need confirmation.

Responsive: usable on phone for checking jobs/customers; desktop for quotes.

Accessibility: semantic HTML, labels, keyboard-usable controls, visible focus. Aim for good defaults via shadcn/Radix — not a full WCAG certification project.

---

# 20. Testing

Test only what protects credibility:

1. Quote total calculation (incl. tax/discount)
2. Payment balance calculation
3. Status transition helpers

Optional if time: a couple of RLS/manual tenant checks documented in README.

Do not chase coverage metrics.

---

# 21. Development Strategy

Target: finishable by one junior in weeks, not months.

## Phase 1 — Foundation (≈ 1 week)

- Vite + React + TS + Tailwind + shadcn
- routing + app shell
- Supabase env + auth (signup/signin/signout)
- `organizations` + `profiles` (1:1 owner model)
- RLS baseline
- protected routes + create-business onboarding

## Phase 2 — Customers (≈ 3–5 days)

- CRUD, list search, detail with placeholders for related data

## Phase 3 — Quotes (≈ 1–1.5 weeks)

- create/edit quote + line items
- totals in minor units
- statuses
- detail page
- print/PDF

## Phase 4 — Work Orders (≈ 3–5 days)

- create from accepted quote + direct create
- status updates
- schedule date
- detail page

## Phase 5 — Payments + simple dashboard (≈ 3–5 days)

- register payments
- show balances
- dashboard KPIs

## Phase 6 — Polish (≈ 3–5 days)

- empty/loading/error consistency
- mobile pass
- README + seed/demo notes
- unit tests for money/status

Do not start later phases by expanding scope. Finish the loop first.

---

# 22. MVP Definition (done when)

A business owner can:

1. Sign up and create their business
2. Add a customer
3. Create a quote with line items and a correct total
4. Mark the quote sent / accepted / rejected
5. Print or export a clean quote
6. Turn an accepted quote into a job
7. Move the job through statuses and complete it
8. Register a payment (including partial)
9. See remaining balance
10. See basic KPIs on the dashboard

Everything else is secondary.

---

# 23. Success Criteria (for a junior portfolio)

The project should demonstrate:

- a real product workflow (not isolated screens)
- clean TypeScript
- relational data modeling
- authentication
- multi-tenant isolation with RLS
- correct money handling
- explicit status rules
- readable architecture
- usable responsive UI
- a few meaningful tests

It should be:

1. **Defendable** in a junior / student interview  
2. **Finishable** by one developer without months of work  
3. **Honest** — simple where simplicity is enough, careful where money/security matter  

---

# 24. Important Rule

Do not build features because they sound impressive.

Build the smallest product that clearly solves:

**customers, quotes, jobs, and payments — safely and clearly.**
