-- Operafy security hardening (run once after 001 + 004 + 005).
-- Fixes:
-- 1) profiles.organization_id cannot be reassigned by the client
-- 2) one owner → one organization (unique owner_id)
-- 3) quotes / line items: SELECT-only via RLS (writes only through RPCs)
-- 4) safer quote numbering under concurrency
-- 5) delete_customer blocked when quotes still reference the customer

-- ---------------------------------------------------------------------------
-- 1) Protect profile organization_id
-- ---------------------------------------------------------------------------

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

-- Keep profile update policy simple; organization_id lock is trigger-based.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) One owner → one organization
-- ---------------------------------------------------------------------------

create unique index if not exists organizations_owner_id_unique
  on public.organizations (owner_id);

-- ---------------------------------------------------------------------------
-- 3) Quotes: remove direct write policies (RPC-only writes)
-- ---------------------------------------------------------------------------

drop policy if exists "Members can insert quotes in their org" on public.quotes;
drop policy if exists "Members can update quotes in their org" on public.quotes;
drop policy if exists "Members can delete quotes in their org" on public.quotes;
drop policy if exists "Members can insert quote line items in their org" on public.quote_line_items;
drop policy if exists "Members can update quote line items in their org" on public.quote_line_items;
drop policy if exists "Members can delete quote line items in their org" on public.quote_line_items;

revoke insert, update, delete on table public.quotes from authenticated;
revoke insert, update, delete on table public.quote_line_items from authenticated;
grant select on table public.quotes to authenticated;
grant select on table public.quote_line_items to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Safer quote numbering
-- ---------------------------------------------------------------------------

create or replace function public.next_quote_number(p_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  -- Serialize numbering per organization for this transaction.
  perform pg_advisory_xact_lock(hashtextextended(p_org_id::text, 0));

  select coalesce(
    max(
      case
        when q.quote_number ~ '^Q-[0-9]+$'
          then nullif(substring(q.quote_number from 3), '')::integer
        else null
      end
    ),
    0
  ) + 1
  into v_next
  from public.quotes q
  where q.organization_id = p_org_id;

  return 'Q-' || lpad(v_next::text, 4, '0');
end;
$$;

revoke all on function public.next_quote_number(uuid) from public;
grant execute on function public.next_quote_number(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Block customer delete when quotes exist
-- ---------------------------------------------------------------------------

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

revoke all on function public.delete_customer(uuid) from public;
grant execute on function public.delete_customer(uuid) to authenticated;

notify pgrst, 'reload schema';
