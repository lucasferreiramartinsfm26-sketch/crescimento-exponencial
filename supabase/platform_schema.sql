-- Crescimento Exponencial: base segura para empresas, oportunidades e administração.
-- Execute este arquivo no SQL Editor do Supabase.
-- Não altera nem apaga a tabela public.tasks nem os dados atuais dos usuários.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  email text not null,
  website text,
  description text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_profiles_owner_id_idx
  on public.company_profiles(owner_id);
create index if not exists company_profiles_status_idx
  on public.company_profiles(status);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 180),
  description text not null,
  requirements text not null default '',
  compensation text not null default '',
  application_url text,
  payment_method text not null default '',
  deadline date,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunities_company_id_idx
  on public.opportunities(company_id);
create index if not exists opportunities_status_deadline_idx
  on public.opportunities(status, deadline);

create table if not exists public.opportunity_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  reason text not null,
  details text not null default '',
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists opportunity_reports_status_idx
  on public.opportunity_reports(status);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

alter table public.platform_admins enable row level security;
alter table public.company_profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_reports enable row level security;

-- Administradores: permissões totais apenas para usuários cadastrados manualmente
-- em platform_admins pelo proprietário no SQL Editor.
drop policy if exists platform_admins_no_client_access on public.platform_admins;
-- Sem políticas de cliente nesta tabela: usuários autenticados não podem listar,
-- inserir, alterar ou remover administradores.

drop policy if exists companies_read_own_or_admin on public.company_profiles;
create policy companies_read_own_or_admin
on public.company_profiles for select to authenticated
using (owner_id = auth.uid() or public.is_platform_admin());

drop policy if exists companies_register_pending on public.company_profiles;
create policy companies_register_pending
on public.company_profiles for insert to authenticated
with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists companies_update_pending on public.company_profiles;
create policy companies_update_pending
on public.company_profiles for update to authenticated
using (owner_id = auth.uid() and status = 'pending')
with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists companies_admin_all on public.company_profiles;
create policy companies_admin_all
on public.company_profiles for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists opportunities_read_approved_or_owner on public.opportunities;
create policy opportunities_read_approved_or_owner
on public.opportunities for select to authenticated
using (
  status = 'approved'
  or public.is_platform_admin()
  or exists (
    select 1 from public.company_profiles c
    where c.id = company_id and c.owner_id = auth.uid()
  )
);

drop policy if exists opportunities_create_pending on public.opportunities;
create policy opportunities_create_pending
on public.opportunities for insert to authenticated
with check (
  status = 'pending'
  and exists (
    select 1 from public.company_profiles c
    where c.id = company_id
      and c.owner_id = auth.uid()
      and c.status = 'approved'
  )
);

drop policy if exists opportunities_update_pending on public.opportunities;
create policy opportunities_update_pending
on public.opportunities for update to authenticated
using (
  status = 'pending'
  and exists (
    select 1 from public.company_profiles c
    where c.id = company_id and c.owner_id = auth.uid()
  )
)
with check (
  status = 'pending'
  and exists (
    select 1 from public.company_profiles c
    where c.id = company_id and c.owner_id = auth.uid()
  )
);

drop policy if exists opportunities_admin_all on public.opportunities;
create policy opportunities_admin_all
on public.opportunities for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists reports_submit_own on public.opportunity_reports;
create policy reports_submit_own
on public.opportunity_reports for insert to authenticated
with check (reporter_id = auth.uid() and status = 'open');

drop policy if exists reports_read_own_or_admin on public.opportunity_reports;
create policy reports_read_own_or_admin
on public.opportunity_reports for select to authenticated
using (reporter_id = auth.uid() or public.is_platform_admin());

drop policy if exists reports_admin_update on public.opportunity_reports;
create policy reports_admin_update
on public.opportunity_reports for update to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

grant select, insert, update on public.company_profiles to authenticated;
grant select, insert, update on public.opportunities to authenticated;
grant select, insert, update on public.opportunity_reports to authenticated;

-- IMPORTANTE: após executar, o proprietário deve cadastrar seu próprio usuário
-- como administrador no SQL Editor. Use o e-mail exato da conta de login:
-- insert into public.platform_admins (user_id)
-- select id from auth.users where lower(email) = lower('SEU_EMAIL_AQUI')
-- on conflict (user_id) do nothing;
