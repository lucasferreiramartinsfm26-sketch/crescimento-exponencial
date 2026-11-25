-- Permite que a empresa proprietária atualize seus dados cadastrais,
-- inclusive após aprovação, sem permitir que altere o próprio status.
-- Execute após platform_schema.sql e company_registration_fields.sql.
begin;

drop policy if exists companies_update_pending on public.company_profiles;
drop policy if exists companies_update_own on public.company_profiles;

create policy companies_update_own
on public.company_profiles
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.is_platform_admin()
)
with check (
  owner_id = auth.uid()
  or public.is_platform_admin()
);

create or replace function public.protect_company_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status
     and not public.is_platform_admin() then
    raise exception 'Somente a administração pode alterar o status da empresa.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_company_status_trigger
on public.company_profiles;

create trigger protect_company_status_trigger
before update on public.company_profiles
for each row
execute function public.protect_company_status();

commit;
