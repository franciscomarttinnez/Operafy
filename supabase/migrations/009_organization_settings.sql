-- Ensure owners can update their organization from the settings page.
-- RLS policy "Owners can update their organization" already exists in 001.

grant select, update on table public.organizations to authenticated;
