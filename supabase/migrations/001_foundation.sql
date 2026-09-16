-- Operafy Phase 1: auth profiles + organizations + RLS
-- Run this in the Supabase SQL editor (or via CLI migrations).

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  phone text,
  email text,
  address text,
  default_currency text not null default 'USD' check (char_length(default_currency) = 3),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_owner_id_idx on public.organizations (owner_id);
create unique index if not exists organizations_owner_id_unique on public.organizations (owner_id);
create index if not exists profiles_organization_id_idx on public.profiles (organization_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.create_organization_for_owner(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_default_currency text default 'USD'
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org public.organizations;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.organization_id is not null
  ) then
    raise exception 'User already belongs to an organization';
  end if;

  if exists (
    select 1 from public.organizations o
    where o.owner_id = v_user_id
  ) then
    raise exception 'User already owns an organization';
  end if;

  insert into public.organizations (
    name,
    phone,
    email,
    address,
    default_currency,
    owner_id
  )
  values (
    trim(p_name),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    upper(trim(p_default_currency)),
    v_user_id
  )
  returning * into v_org;

  perform set_config('operafy.allow_profile_org_update', 'on', true);

  update public.profiles
  set organization_id = v_org.id
  where id = v_user_id;

  return v_org;
end;
$$;

revoke all on function public.create_organization_for_owner from public;
grant execute on function public.create_organization_for_owner to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Client updates may change name fields, but not organization_id (enforced by trigger).
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Prevent direct organization_id reassignment (RPC sets a local GUC to allow once).
create or replace function public.prevent_profile_org_reassignment()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    if current_setting('operafy.allow_profile_org_update', true) is distinct from 'on' then
      raise exception 'organization_id cannot be changed directly';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_org_reassignment on public.profiles;
create trigger profiles_prevent_org_reassignment
before update on public.profiles
for each row
execute function public.prevent_profile_org_reassignment();

drop policy if exists "Owners can read their organization" on public.organizations;
create policy "Owners can read their organization"
on public.organizations
for select
to authenticated
using (
  owner_id = auth.uid()
  or id = (
    select p.organization_id from public.profiles p where p.id = auth.uid()
  )
);

drop policy if exists "Owners can update their organization" on public.organizations;
create policy "Owners can update their organization"
on public.organizations
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Inserts go through create_organization_for_owner (security definer).
-- No direct insert policy for organizations from the client.
