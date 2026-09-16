-- Allow deleting rejected quotes (cleanup), still block sent/accepted.
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

  if v_quote.status not in ('draft', 'rejected') then
    raise exception 'Only draft or rejected quotes can be deleted';
  end if;

  if exists (
    select 1
    from public.work_orders wo
    where wo.quote_id = p_quote_id
      and wo.organization_id = v_org_id
  ) then
    raise exception 'Cannot delete quote with linked work orders. Delete those jobs first.';
  end if;

  delete from public.quotes q
  where q.id = p_quote_id
    and q.organization_id = v_org_id;
end;
$$;

revoke all on function public.delete_quote(uuid) from public;
grant execute on function public.delete_quote(uuid) to authenticated;

notify pgrst, 'reload schema';
