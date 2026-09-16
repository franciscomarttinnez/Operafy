-- Operafy Phase 5: payments
-- Run once after 007_work_orders.sql (and prior migrations).

do $$ begin
  create type public.payment_method as enum ('cash', 'transfer', 'card', 'other');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  work_order_id uuid not null references public.work_orders (id) on delete restrict,
  amount bigint not null check (amount > 0),
  method public.payment_method not null default 'cash',
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_organization_id_idx
  on public.payments (organization_id);

create index if not exists payments_organization_paid_at_idx
  on public.payments (organization_id, paid_at desc);

create index if not exists payments_customer_id_idx
  on public.payments (customer_id);

create index if not exists payments_work_order_id_idx
  on public.payments (work_order_id);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

grant usage on schema public to authenticated;
grant select on table public.payments to authenticated;

drop policy if exists "Members can select payments in their org" on public.payments;
create policy "Members can select payments in their org"
on public.payments for select to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

create or replace function public.create_payment(
  p_work_order_id uuid,
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
  v_work_order public.work_orders;
  v_paid bigint;
  v_balance bigint;
  v_payment public.payments;
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

  select * into v_work_order
  from public.work_orders wo
  where wo.id = p_work_order_id
    and wo.organization_id = v_org_id;

  if not found then
    raise exception 'Work order not found';
  end if;

  if v_work_order.status = 'cancelled' then
    raise exception 'Cannot register payments on a cancelled work order';
  end if;

  select coalesce(sum(pay.amount), 0)::bigint into v_paid
  from public.payments pay
  where pay.work_order_id = p_work_order_id
    and pay.organization_id = v_org_id;

  v_balance := v_work_order.billable_amount - v_paid;

  if p_amount > v_balance then
    raise exception 'Payment exceeds outstanding balance (% remaining)', v_balance;
  end if;

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
    v_work_order.customer_id,
    v_work_order.id,
    p_amount,
    p_method,
    coalesce(p_paid_at, now()),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into v_payment;

  return v_payment;
end;
$$;

create or replace function public.delete_payment(
  p_payment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_deleted int;
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

  delete from public.payments pay
  where pay.id = p_payment_id
    and pay.organization_id = v_org_id;

  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'Payment not found';
  end if;
end;
$$;

-- Block work order delete when payments exist.
create or replace function public.delete_work_order(
  p_work_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_work_order public.work_orders;
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

  select * into v_work_order
  from public.work_orders wo
  where wo.id = p_work_order_id
    and wo.organization_id = v_org_id;

  if not found then
    raise exception 'Work order not found';
  end if;

  if v_work_order.status not in ('pending', 'cancelled') then
    raise exception 'Only pending or cancelled work orders can be deleted';
  end if;

  if exists (
    select 1
    from public.payments pay
    where pay.work_order_id = p_work_order_id
      and pay.organization_id = v_org_id
  ) then
    raise exception 'Cannot delete work order with existing payments. Delete those payments first.';
  end if;

  delete from public.work_orders wo
  where wo.id = p_work_order_id
    and wo.organization_id = v_org_id;
end;
$$;

-- Keep customer delete safe when payments exist.
create or replace function public.delete_customer(
  p_customer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_deleted int;
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

  if to_regclass('public.quotes') is not null
     and exists (
       select 1
       from public.quotes q
       where q.customer_id = p_customer_id
         and q.organization_id = v_org_id
     ) then
    raise exception 'Cannot delete customer with existing quotes. Delete or reassign quotes first.';
  end if;

  if to_regclass('public.work_orders') is not null
     and exists (
       select 1
       from public.work_orders wo
       where wo.customer_id = p_customer_id
         and wo.organization_id = v_org_id
     ) then
    raise exception 'Cannot delete customer with existing work orders. Delete those jobs first.';
  end if;

  if exists (
    select 1
    from public.payments pay
    where pay.customer_id = p_customer_id
      and pay.organization_id = v_org_id
  ) then
    raise exception 'Cannot delete customer with existing payments. Delete those payments first.';
  end if;

  delete from public.customers c
  where c.id = p_customer_id
    and c.organization_id = v_org_id;

  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'Customer not found';
  end if;
end;
$$;

revoke all on function public.create_payment(uuid, bigint, public.payment_method, timestamptz, text) from public;
revoke all on function public.delete_payment(uuid) from public;
revoke all on function public.delete_work_order(uuid) from public;
revoke all on function public.delete_customer(uuid) from public;

grant execute on function public.create_payment(uuid, bigint, public.payment_method, timestamptz, text) to authenticated;
grant execute on function public.delete_payment(uuid) to authenticated;
grant execute on function public.delete_work_order(uuid) to authenticated;
grant execute on function public.delete_customer(uuid) to authenticated;

notify pgrst, 'reload schema';
