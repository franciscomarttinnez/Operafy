-- Operafy Phase 9: update payment + demo seed helper
-- Run once after 009_organization_settings.sql

create or replace function public.update_payment(
  p_payment_id uuid,
  p_amount bigint,
  p_method public.payment_method default 'cash',
  p_paid_at timestamptz default now(),
  p_notes text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_payment public.payments;
  v_work_order public.work_orders;
  v_paid bigint;
  v_balance bigint;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.organization_id into v_org_id
  from public.profiles p
  where p.id = v_user_id;

  if v_org_id is null then
    raise exception 'No organization found for current user.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0';
  end if;

  select * into v_payment
  from public.payments pay
  where pay.id = p_payment_id
    and pay.organization_id = v_org_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  select * into v_work_order
  from public.work_orders wo
  where wo.id = v_payment.work_order_id
    and wo.organization_id = v_org_id;

  if not found then
    raise exception 'Work order not found';
  end if;

  if v_work_order.status = 'cancelled' then
    raise exception 'Cannot update payments on a cancelled work order';
  end if;

  select coalesce(sum(pay.amount), 0)::bigint into v_paid
  from public.payments pay
  where pay.work_order_id = v_payment.work_order_id
    and pay.organization_id = v_org_id
    and pay.id <> p_payment_id;

  v_balance := v_work_order.billable_amount - v_paid;

  if p_amount > v_balance then
    raise exception 'Payment exceeds outstanding balance (% remaining)', v_balance;
  end if;

  update public.payments pay
  set
    amount = p_amount,
    method = p_method,
    paid_at = coalesce(p_paid_at, now()),
    notes = nullif(trim(coalesce(p_notes, '')), '')
  where pay.id = p_payment_id
    and pay.organization_id = v_org_id
  returning * into v_payment;

  return v_payment;
end;
$$;

revoke all on function public.update_payment(uuid, bigint, public.payment_method, timestamptz, text) from public;
grant execute on function public.update_payment(uuid, bigint, public.payment_method, timestamptz, text) to authenticated;

-- Seeds demo customers/quotes/jobs/payments for the current user's organization.
-- Safe to re-run: skips if a "[Demo]" customer already exists.
create or replace function public.seed_demo_data()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_customer_a uuid;
  v_customer_b uuid;
  v_quote_id uuid;
  v_wo_a uuid;
  v_wo_b uuid;
  v_quote_number text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.organization_id into v_org_id
  from public.profiles p
  where p.id = v_user_id;

  if v_org_id is null then
    raise exception 'No organization found for current user. Complete onboarding first.';
  end if;

  if exists (
    select 1
    from public.customers c
    where c.organization_id = v_org_id
      and c.name like '[Demo]%'
  ) then
    return 'Demo data already exists for this organization. Skipped.';
  end if;

  insert into public.customers (organization_id, name, phone, email, address, notes)
  values (
    v_org_id,
    '[Demo] Ana Pérez',
    '+54 11 5555-1001',
    'ana.demo@example.com',
    'Av. Demo 123',
    'Seed customer for portfolio demos'
  )
  returning id into v_customer_a;

  insert into public.customers (organization_id, name, phone, email, address, notes)
  values (
    v_org_id,
    '[Demo] Luis Gómez',
    '+54 11 5555-1002',
    'luis.demo@example.com',
    'Calle Ejemplo 45',
    'Seed customer with outstanding balance'
  )
  returning id into v_customer_b;

  v_quote_number := public.next_quote_number(v_org_id);

  insert into public.quotes (
    organization_id,
    customer_id,
    quote_number,
    title,
    status,
    notes,
    subtotal,
    tax_amount,
    discount_amount,
    total
  )
  values (
    v_org_id,
    v_customer_a,
    v_quote_number,
    '[Demo] Service visit',
    'accepted',
    'Demo accepted quote',
    150000,
    0,
    0,
    150000
  )
  returning id into v_quote_id;

  insert into public.quote_line_items (
    organization_id,
    quote_id,
    description,
    quantity,
    unit_price,
    line_total,
    position
  )
  values
    (v_org_id, v_quote_id, 'Labor', 1, 90000, 90000, 1),
    (v_org_id, v_quote_id, 'Parts', 1, 60000, 60000, 2);

  insert into public.work_orders (
    organization_id,
    customer_id,
    quote_id,
    title,
    description,
    scheduled_date,
    status,
    billable_amount,
    notes
  )
  values (
    v_org_id,
    v_customer_a,
    v_quote_id,
    '[Demo] Service visit',
    'Demo job from accepted quote',
    current_date,
    'in_progress',
    150000,
    'Partially paid demo job'
  )
  returning id into v_wo_a;

  insert into public.work_orders (
    organization_id,
    customer_id,
    quote_id,
    title,
    description,
    scheduled_date,
    status,
    billable_amount,
    notes
  )
  values (
    v_org_id,
    v_customer_b,
    null,
    '[Demo] Maintenance visit',
    'Direct demo job with unpaid balance',
    current_date + 2,
    'scheduled',
    80000,
    'Unpaid demo job'
  )
  returning id into v_wo_b;

  insert into public.payments (
    organization_id,
    customer_id,
    work_order_id,
    amount,
    method,
    paid_at,
    notes
  )
  values (
    v_org_id,
    v_customer_a,
    v_wo_a,
    50000,
    'transfer',
    now() - interval '1 day',
    'Demo partial payment'
  );

  return 'Demo data created: 2 customers, 1 quote, 2 jobs, 1 payment.';
end;
$$;

revoke all on function public.seed_demo_data() from public;
grant execute on function public.seed_demo_data() to authenticated;

notify pgrst, 'reload schema';
