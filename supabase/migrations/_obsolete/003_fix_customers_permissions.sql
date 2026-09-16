-- Fix: ensure authenticated role can use customers + helper
-- Run this in Supabase SQL editor if customer create/list fails.

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.customers to authenticated;

grant execute on function public.current_organization_id() to authenticated;

-- Make sure the helper can always read the caller's profile.
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

revoke all on function public.current_organization_id() from public;
grant execute on function public.current_organization_id() to authenticated;

-- Recreate policies (safe if they already exist)
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

notify pgrst, 'reload schema';
