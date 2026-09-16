-- Clear seeded demo rows, or wipe all business data for the current org.
-- Does not delete the organization, profile, or auth user.

create or replace function public.clear_demo_data()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_customers int := 0;
  v_quotes int := 0;
  v_jobs int := 0;
  v_payments int := 0;
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

  if not exists (
    select 1
    from public.customers c
    where c.organization_id = v_org_id
      and c.name like '[Demo]%'
  ) then
    return 'No demo data found for this organization.';
  end if;

  -- Payments on demo customers / demo jobs
  with deleted as (
    delete from public.payments pay
    where pay.organization_id = v_org_id
      and (
        pay.customer_id in (
          select c.id
          from public.customers c
          where c.organization_id = v_org_id
            and c.name like '[Demo]%'
        )
        or pay.work_order_id in (
          select wo.id
          from public.work_orders wo
          where wo.organization_id = v_org_id
            and (
              wo.title like '[Demo]%'
              or wo.customer_id in (
                select c.id
                from public.customers c
                where c.organization_id = v_org_id
                  and c.name like '[Demo]%'
              )
            )
        )
      )
    returning 1
  )
  select count(*) into v_payments from deleted;

  with deleted as (
    delete from public.work_orders wo
    where wo.organization_id = v_org_id
      and (
        wo.title like '[Demo]%'
        or wo.customer_id in (
          select c.id
          from public.customers c
          where c.organization_id = v_org_id
            and c.name like '[Demo]%'
        )
      )
    returning 1
  )
  select count(*) into v_jobs from deleted;

  with deleted as (
    delete from public.quotes q
    where q.organization_id = v_org_id
      and (
        q.title like '[Demo]%'
        or q.customer_id in (
          select c.id
          from public.customers c
          where c.organization_id = v_org_id
            and c.name like '[Demo]%'
        )
      )
    returning 1
  )
  select count(*) into v_quotes from deleted;

  with deleted as (
    delete from public.customers c
    where c.organization_id = v_org_id
      and c.name like '[Demo]%'
    returning 1
  )
  select count(*) into v_customers from deleted;

  return format(
    'Demo data removed: %s customers, %s quotes, %s jobs, %s payments.',
    v_customers,
    v_quotes,
    v_jobs,
    v_payments
  );
end;
$$;

create or replace function public.wipe_organization_data()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_customers int := 0;
  v_quotes int := 0;
  v_jobs int := 0;
  v_payments int := 0;
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

  -- FK order: payments → work_orders → quotes (line items cascade) → customers
  with deleted as (
    delete from public.payments pay
    where pay.organization_id = v_org_id
    returning 1
  )
  select count(*) into v_payments from deleted;

  with deleted as (
    delete from public.work_orders wo
    where wo.organization_id = v_org_id
    returning 1
  )
  select count(*) into v_jobs from deleted;

  with deleted as (
    delete from public.quotes q
    where q.organization_id = v_org_id
    returning 1
  )
  select count(*) into v_quotes from deleted;

  with deleted as (
    delete from public.customers c
    where c.organization_id = v_org_id
    returning 1
  )
  select count(*) into v_customers from deleted;

  return format(
    'Organization reset: %s customers, %s quotes, %s jobs, %s payments removed. Business profile kept.',
    v_customers,
    v_quotes,
    v_jobs,
    v_payments
  );
end;
$$;

revoke all on function public.clear_demo_data() from public;
revoke all on function public.wipe_organization_data() from public;
grant execute on function public.clear_demo_data() to authenticated;
grant execute on function public.wipe_organization_data() to authenticated;

notify pgrst, 'reload schema';
