-- Operafy Phase 3: quotes + line items + RPCs
-- Run once in Supabase SQL Editor after 001 + 004.

do $$ begin
  create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  quote_number text not null,
  title text not null check (char_length(trim(title)) > 0),
  notes text,
  status public.quote_status not null default 'draft',
  subtotal bigint not null default 0 check (subtotal >= 0),
  tax_amount bigint not null default 0 check (tax_amount >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  total bigint not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, quote_number)
);

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  description text not null check (char_length(trim(description)) > 0),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  line_total bigint not null check (line_total >= 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_organization_id_idx on public.quotes (organization_id);
create index if not exists quotes_organization_created_at_idx on public.quotes (organization_id, created_at desc);
create index if not exists quotes_customer_id_idx on public.quotes (customer_id);
create index if not exists quote_line_items_quote_id_idx on public.quote_line_items (quote_id);

drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at
before update on public.quotes
for each row execute function public.set_updated_at();

drop trigger if exists quote_line_items_set_updated_at on public.quote_line_items;
create trigger quote_line_items_set_updated_at
before update on public.quote_line_items
for each row execute function public.set_updated_at();

alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;

grant usage on schema public to authenticated;
grant select on table public.quotes to authenticated;
grant select on table public.quote_line_items to authenticated;

drop policy if exists "Members can select quotes in their org" on public.quotes;
create policy "Members can select quotes in their org"
on public.quotes for select to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "Members can select quote line items in their org" on public.quote_line_items;
create policy "Members can select quote line items in their org"
on public.quote_line_items for select to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

-- Writes only via security definer RPCs (no direct insert/update/delete policies).

create or replace function public.next_quote_number(p_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
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

create or replace function public.create_quote(
  p_customer_id uuid,
  p_title text,
  p_notes text default null,
  p_tax_amount bigint default 0,
  p_discount_amount bigint default 0,
  p_line_items jsonb default '[]'::jsonb
)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_customer public.customers;
  v_quote public.quotes;
  v_item jsonb;
  v_index integer := 0;
  v_description text;
  v_quantity numeric(12, 2);
  v_unit_price bigint;
  v_line_total bigint;
  v_subtotal bigint := 0;
  v_tax bigint := coalesce(p_tax_amount, 0);
  v_discount bigint := coalesce(p_discount_amount, 0);
  v_total bigint;
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

  if p_title is null or char_length(trim(p_title)) = 0 then
    raise exception 'Quote title is required';
  end if;

  if v_tax < 0 or v_discount < 0 then
    raise exception 'Tax and discount must be >= 0';
  end if;

  if p_line_items is null or jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
    raise exception 'At least one line item is required';
  end if;

  select * into v_customer
  from public.customers c
  where c.id = p_customer_id
    and c.organization_id = v_org_id;

  if not found then
    raise exception 'Customer not found in your organization';
  end if;

  for v_item in select * from jsonb_array_elements(p_line_items)
  loop
    v_description := trim(coalesce(v_item ->> 'description', ''));
    v_quantity := coalesce((v_item ->> 'quantity')::numeric, 0);
    v_unit_price := coalesce((v_item ->> 'unit_price')::bigint, 0);

    if char_length(v_description) = 0 then
      raise exception 'Each line item needs a description';
    end if;
    if v_quantity <= 0 then
      raise exception 'Line item quantity must be > 0';
    end if;
    if v_unit_price < 0 then
      raise exception 'Line item unit price must be >= 0';
    end if;

    v_line_total := round(v_quantity * v_unit_price)::bigint;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if v_discount > v_subtotal + v_tax then
    raise exception 'Discount cannot exceed subtotal + tax';
  end if;

  v_total := v_subtotal - v_discount + v_tax;

  insert into public.quotes (
    organization_id,
    customer_id,
    quote_number,
    title,
    notes,
    status,
    subtotal,
    tax_amount,
    discount_amount,
    total
  )
  values (
    v_org_id,
    p_customer_id,
    public.next_quote_number(v_org_id),
    trim(p_title),
    nullif(trim(coalesce(p_notes, '')), ''),
    'draft',
    v_subtotal,
    v_tax,
    v_discount,
    v_total
  )
  returning * into v_quote;

  v_index := 0;
  for v_item in select * from jsonb_array_elements(p_line_items)
  loop
    v_description := trim(coalesce(v_item ->> 'description', ''));
    v_quantity := coalesce((v_item ->> 'quantity')::numeric, 0);
    v_unit_price := coalesce((v_item ->> 'unit_price')::bigint, 0);
    v_line_total := round(v_quantity * v_unit_price)::bigint;

    insert into public.quote_line_items (
      organization_id,
      quote_id,
      description,
      quantity,
      unit_price,
      line_total,
      position
    )
    values (
      v_org_id,
      v_quote.id,
      v_description,
      v_quantity,
      v_unit_price,
      v_line_total,
      v_index
    );

    v_index := v_index + 1;
  end loop;

  return v_quote;
end;
$$;

create or replace function public.update_quote(
  p_quote_id uuid,
  p_customer_id uuid,
  p_title text,
  p_notes text default null,
  p_tax_amount bigint default 0,
  p_discount_amount bigint default 0,
  p_line_items jsonb default '[]'::jsonb
)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_quote public.quotes;
  v_customer public.customers;
  v_item jsonb;
  v_index integer := 0;
  v_description text;
  v_quantity numeric(12, 2);
  v_unit_price bigint;
  v_line_total bigint;
  v_subtotal bigint := 0;
  v_tax bigint := coalesce(p_tax_amount, 0);
  v_discount bigint := coalesce(p_discount_amount, 0);
  v_total bigint;
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

  if v_quote.status <> 'draft' then
    raise exception 'Only draft quotes can be edited';
  end if;

  if p_title is null or char_length(trim(p_title)) = 0 then
    raise exception 'Quote title is required';
  end if;

  if v_tax < 0 or v_discount < 0 then
    raise exception 'Tax and discount must be >= 0';
  end if;

  if p_line_items is null or jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
    raise exception 'At least one line item is required';
  end if;

  select * into v_customer
  from public.customers c
  where c.id = p_customer_id
    and c.organization_id = v_org_id;

  if not found then
    raise exception 'Customer not found in your organization';
  end if;

  for v_item in select * from jsonb_array_elements(p_line_items)
  loop
    v_description := trim(coalesce(v_item ->> 'description', ''));
    v_quantity := coalesce((v_item ->> 'quantity')::numeric, 0);
    v_unit_price := coalesce((v_item ->> 'unit_price')::bigint, 0);

    if char_length(v_description) = 0 then
      raise exception 'Each line item needs a description';
    end if;
    if v_quantity <= 0 then
      raise exception 'Line item quantity must be > 0';
    end if;
    if v_unit_price < 0 then
      raise exception 'Line item unit price must be >= 0';
    end if;

    v_line_total := round(v_quantity * v_unit_price)::bigint;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if v_discount > v_subtotal + v_tax then
    raise exception 'Discount cannot exceed subtotal + tax';
  end if;

  v_total := v_subtotal - v_discount + v_tax;

  update public.quotes q
  set
    customer_id = p_customer_id,
    title = trim(p_title),
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    subtotal = v_subtotal,
    tax_amount = v_tax,
    discount_amount = v_discount,
    total = v_total
  where q.id = p_quote_id
    and q.organization_id = v_org_id
  returning * into v_quote;

  delete from public.quote_line_items li
  where li.quote_id = p_quote_id
    and li.organization_id = v_org_id;

  v_index := 0;
  for v_item in select * from jsonb_array_elements(p_line_items)
  loop
    v_description := trim(coalesce(v_item ->> 'description', ''));
    v_quantity := coalesce((v_item ->> 'quantity')::numeric, 0);
    v_unit_price := coalesce((v_item ->> 'unit_price')::bigint, 0);
    v_line_total := round(v_quantity * v_unit_price)::bigint;

    insert into public.quote_line_items (
      organization_id,
      quote_id,
      description,
      quantity,
      unit_price,
      line_total,
      position
    )
    values (
      v_org_id,
      v_quote.id,
      v_description,
      v_quantity,
      v_unit_price,
      v_line_total,
      v_index
    );

    v_index := v_index + 1;
  end loop;

  return v_quote;
end;
$$;

create or replace function public.set_quote_status(
  p_quote_id uuid,
  p_status public.quote_status
)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_quote public.quotes;
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

  if v_quote.status = p_status then
    return v_quote;
  end if;

  if v_quote.status = 'draft' and p_status in ('sent', 'rejected') then
    null;
  elsif v_quote.status = 'sent' and p_status in ('accepted', 'rejected') then
    null;
  else
    raise exception 'Invalid status transition from % to %', v_quote.status, p_status;
  end if;

  update public.quotes q
  set status = p_status
  where q.id = p_quote_id
    and q.organization_id = v_org_id
  returning * into v_quote;

  return v_quote;
end;
$$;

create or replace function public.delete_quote(
  p_quote_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_quote public.quotes;
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

  if v_quote.status <> 'draft' then
    raise exception 'Only draft quotes can be deleted';
  end if;

  delete from public.quotes q
  where q.id = p_quote_id
    and q.organization_id = v_org_id;
end;
$$;

revoke all on function public.next_quote_number(uuid) from public;
revoke all on function public.create_quote(uuid, text, text, bigint, bigint, jsonb) from public;
revoke all on function public.update_quote(uuid, uuid, text, text, bigint, bigint, jsonb) from public;
revoke all on function public.set_quote_status(uuid, public.quote_status) from public;
revoke all on function public.delete_quote(uuid) from public;

grant execute on function public.create_quote(uuid, text, text, bigint, bigint, jsonb) to authenticated;
grant execute on function public.update_quote(uuid, uuid, text, text, bigint, bigint, jsonb) to authenticated;
grant execute on function public.set_quote_status(uuid, public.quote_status) to authenticated;
grant execute on function public.delete_quote(uuid) to authenticated;

notify pgrst, 'reload schema';
