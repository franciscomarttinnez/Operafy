-- Operafy Phase 4: work orders (jobs)
-- Run once after 001 + 004 + 005 (+ 006 if already applied).

do $$ begin
  create type public.work_order_status as enum (
    'pending',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  quote_id uuid references public.quotes (id) on delete restrict,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  scheduled_date date,
  status public.work_order_status not null default 'pending',
  billable_amount bigint not null check (billable_amount >= 0),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_orders_quote_requires_customer check (quote_id is null or customer_id is not null)
);

create unique index if not exists work_orders_quote_id_unique
  on public.work_orders (quote_id)
  where quote_id is not null;

create index if not exists work_orders_organization_id_idx
  on public.work_orders (organization_id);

create index if not exists work_orders_organization_created_at_idx
  on public.work_orders (organization_id, created_at desc);

create index if not exists work_orders_customer_id_idx
  on public.work_orders (customer_id);

create index if not exists work_orders_status_idx
  on public.work_orders (organization_id, status);

drop trigger if exists work_orders_set_updated_at on public.work_orders;
create trigger work_orders_set_updated_at
before update on public.work_orders
for each row execute function public.set_updated_at();

alter table public.work_orders enable row level security;

grant usage on schema public to authenticated;
grant select on table public.work_orders to authenticated;

drop policy if exists "Members can select work orders in their org" on public.work_orders;
create policy "Members can select work orders in their org"
on public.work_orders for select to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

-- Writes only via security definer RPCs.

create or replace function public.create_work_order_from_quote(
  p_quote_id uuid,
  p_scheduled_date date default null,
  p_notes text default null
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_quote public.quotes;
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

  select * into v_quote
  from public.quotes q
  where q.id = p_quote_id
    and q.organization_id = v_org_id;

  if not found then
    raise exception 'Quote not found';
  end if;

  if v_quote.status <> 'accepted' then
    raise exception 'Only accepted quotes can become work orders';
  end if;

  if exists (
    select 1 from public.work_orders wo
    where wo.quote_id = p_quote_id
      and wo.organization_id = v_org_id
  ) then
    raise exception 'A work order already exists for this quote';
  end if;

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
    v_quote.customer_id,
    v_quote.id,
    v_quote.title,
    null,
    p_scheduled_date,
    case when p_scheduled_date is null then 'pending'::public.work_order_status
         else 'scheduled'::public.work_order_status end,
    v_quote.total,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into v_work_order;

  return v_work_order;
end;
$$;

create or replace function public.create_work_order(
  p_customer_id uuid,
  p_title text,
  p_description text default null,
  p_billable_amount bigint default 0,
  p_scheduled_date date default null,
  p_notes text default null
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_customer public.customers;
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

  if char_length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'Title is required';
  end if;

  if p_billable_amount is null or p_billable_amount < 0 then
    raise exception 'Billable amount must be a non-negative integer';
  end if;

  select * into v_customer
  from public.customers c
  where c.id = p_customer_id
    and c.organization_id = v_org_id;

  if not found then
    raise exception 'Customer not found';
  end if;

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
    v_customer.id,
    null,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    p_scheduled_date,
    case when p_scheduled_date is null then 'pending'::public.work_order_status
         else 'scheduled'::public.work_order_status end,
    p_billable_amount,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into v_work_order;

  return v_work_order;
end;
$$;

create or replace function public.update_work_order(
  p_work_order_id uuid,
  p_title text,
  p_description text default null,
  p_scheduled_date date default null,
  p_notes text default null,
  p_billable_amount bigint default null
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_work_order public.work_orders;
  v_next_status public.work_order_status;
  v_billable bigint;
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

  if v_work_order.status in ('completed', 'cancelled') then
    raise exception 'Completed or cancelled work orders cannot be edited';
  end if;

  if char_length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'Title is required';
  end if;

  if v_work_order.quote_id is not null then
    v_billable := v_work_order.billable_amount;
  else
    if p_billable_amount is null or p_billable_amount < 0 then
      raise exception 'Billable amount must be a non-negative integer';
    end if;
    v_billable := p_billable_amount;
  end if;

  v_next_status := v_work_order.status;
  if p_scheduled_date is not null and v_work_order.status = 'pending' then
    v_next_status := 'scheduled';
  elsif p_scheduled_date is null and v_work_order.status = 'scheduled' then
    v_next_status := 'pending';
  end if;

  update public.work_orders wo
  set
    title = trim(p_title),
    description = nullif(trim(coalesce(p_description, '')), ''),
    scheduled_date = p_scheduled_date,
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    billable_amount = v_billable,
    status = v_next_status
  where wo.id = p_work_order_id
    and wo.organization_id = v_org_id
  returning * into v_work_order;

  return v_work_order;
end;
$$;

create or replace function public.set_work_order_status(
  p_work_order_id uuid,
  p_status public.work_order_status
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_work_order public.work_orders;
  v_completed_at timestamptz;
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

  if v_work_order.status = p_status then
    return v_work_order;
  end if;

  if v_work_order.status = 'pending' and p_status in ('scheduled', 'in_progress', 'cancelled') then
    null;
  elsif v_work_order.status = 'scheduled' and p_status in ('in_progress', 'cancelled', 'pending') then
    null;
  elsif v_work_order.status = 'in_progress' and p_status in ('completed', 'cancelled') then
    null;
  else
    raise exception 'Invalid status transition from % to %', v_work_order.status, p_status;
  end if;

  if p_status = 'scheduled' and v_work_order.scheduled_date is null then
    raise exception 'Set a scheduled date before marking as scheduled';
  end if;

  v_completed_at := case
    when p_status = 'completed' then now()
    else null
  end;

  update public.work_orders wo
  set
    status = p_status,
    completed_at = v_completed_at
  where wo.id = p_work_order_id
    and wo.organization_id = v_org_id
  returning * into v_work_order;

  return v_work_order;
end;
$$;

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

  delete from public.work_orders wo
  where wo.id = p_work_order_id
    and wo.organization_id = v_org_id;
end;
$$;

-- Keep customer delete safe when jobs exist.
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

  if exists (
    select 1
    from public.work_orders wo
    where wo.customer_id = p_customer_id
      and wo.organization_id = v_org_id
  ) then
    raise exception 'Cannot delete customer with existing work orders. Delete those jobs first.';
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

revoke all on function public.create_work_order_from_quote(uuid, date, text) from public;
revoke all on function public.create_work_order(uuid, text, text, bigint, date, text) from public;
revoke all on function public.update_work_order(uuid, text, text, date, text, bigint) from public;
revoke all on function public.set_work_order_status(uuid, public.work_order_status) from public;
revoke all on function public.delete_work_order(uuid) from public;
revoke all on function public.delete_customer(uuid) from public;

grant execute on function public.create_work_order_from_quote(uuid, date, text) to authenticated;
grant execute on function public.create_work_order(uuid, text, text, bigint, date, text) to authenticated;
grant execute on function public.update_work_order(uuid, text, text, date, text, bigint) to authenticated;
grant execute on function public.set_work_order_status(uuid, public.work_order_status) to authenticated;
grant execute on function public.delete_work_order(uuid) to authenticated;
grant execute on function public.delete_customer(uuid) to authenticated;

notify pgrst, 'reload schema';
