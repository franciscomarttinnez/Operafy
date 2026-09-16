-- Operafy Phase 2: customers + tenant RLS

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.current_organization_id from public;
grant execute on function public.current_organization_id to authenticated;

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

create index if not exists customers_name_idx
  on public.customers (organization_id, lower(name));

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.customers to authenticated;

alter table public.customers enable row level security;

drop policy if exists "Members can select customers in their org" on public.customers;
create policy "Members can select customers in their org"
on public.customers
for select
to authenticated
using (organization_id = public.current_organization_id());

drop policy if exists "Members can insert customers in their org" on public.customers;
create policy "Members can insert customers in their org"
on public.customers
for insert
to authenticated
with check (organization_id = public.current_organization_id());

drop policy if exists "Members can update customers in their org" on public.customers;
create policy "Members can update customers in their org"
on public.customers
for update
to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists "Members can delete customers in their org" on public.customers;
create policy "Members can delete customers in their org"
on public.customers
for delete
to authenticated
using (organization_id = public.current_organization_id());
