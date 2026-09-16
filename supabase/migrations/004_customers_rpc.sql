-- Operafy: definitive customers setup (idempotent)
-- Run this entire file in Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- Ensure updated_at helper exists (from phase 1)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_organization_id_idx
  on public.customers (organization_id);

create index if not exists customers_organization_created_at_idx
  on public.customers (organization_id, created_at desc);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.customers to authenticated;
grant execute on function public.current_organization_id() to authenticated;

drop policy if exists "Members can select customers in their org" on public.customers;
drop policy if exists "Members can insert customers in their org" on public.customers;
drop policy if exists "Members can update customers in their org" on public.customers;
drop policy if exists "Members can delete customers in their org" on public.customers;

-- SELECT uses inline profile lookup (more reliable than only a helper fn)
create policy "Members can select customers in their org"
on public.customers
for select
to authenticated
using (
  organization_id = (
    select p.organization_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

-- Writes go through security definer RPCs below.
-- Keep insert/update/delete policies for direct access too.
create policy "Members can insert customers in their org"
on public.customers
for insert
to authenticated
with check (
  organization_id = (
    select p.organization_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "Members can update customers in their org"
on public.customers
for update
to authenticated
using (
  organization_id = (
    select p.organization_id
    from public.profiles p
    where p.id = auth.uid()
  )
)
with check (
  organization_id = (
    select p.organization_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "Members can delete customers in their org"
on public.customers
for delete
to authenticated
using (
  organization_id = (
    select p.organization_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create or replace function public.create_customer(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_notes text default null
)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_customer public.customers;
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

  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'Customer name is required';
  end if;

  insert into public.customers (
    organization_id,
    name,
    phone,
    email,
    address,
    notes
  )
  values (
    v_org_id,
    trim(p_name),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into v_customer;

  return v_customer;
end;
$$;

create or replace function public.update_customer(
  p_customer_id uuid,
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_notes text default null
)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_customer public.customers;
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

  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'Customer name is required';
  end if;

  update public.customers c
  set
    name = trim(p_name),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    email = nullif(trim(coalesce(p_email, '')), ''),
    address = nullif(trim(coalesce(p_address, '')), ''),
    notes = nullif(trim(coalesce(p_notes, '')), '')
  where c.id = p_customer_id
    and c.organization_id = v_org_id
  returning * into v_customer;

  if not found then
    raise exception 'Customer not found';
  end if;

  return v_customer;
end;
$$;

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

  delete from public.customers c
  where c.id = p_customer_id
    and c.organization_id = v_org_id;

  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'Customer not found';
  end if;
end;
$$;

revoke all on function public.create_customer(text, text, text, text, text) from public;
revoke all on function public.update_customer(uuid, text, text, text, text, text) from public;
revoke all on function public.delete_customer(uuid) from public;

grant execute on function public.create_customer(text, text, text, text, text) to authenticated;
grant execute on function public.update_customer(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.delete_customer(uuid) to authenticated;

notify pgrst, 'reload schema';
