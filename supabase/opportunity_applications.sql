-- Sistema de candidaturas do Crescimento Exponencial
create table if not exists public.opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  candidate_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  resume_url text,
  message text,
  status text not null default 'pending'
    check (status in ('pending','reviewing','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_applications_unique_candidate unique (opportunity_id, candidate_id)
);

create index if not exists opportunity_applications_opportunity_idx
  on public.opportunity_applications(opportunity_id, created_at desc);
create index if not exists opportunity_applications_candidate_idx
  on public.opportunity_applications(candidate_id, created_at desc);

alter table public.opportunity_applications enable row level security;

drop policy if exists "Candidates can apply to approved opportunities" on public.opportunity_applications;
create policy "Candidates can apply to approved opportunities"
on public.opportunity_applications for insert to authenticated
with check (
  candidate_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.opportunities o
    where o.id = opportunity_id
      and o.status = 'approved'
      and (o.deadline is null or o.deadline >= current_date)
  )
);

drop policy if exists "Candidates can view their applications" on public.opportunity_applications;
create policy "Candidates can view their applications"
on public.opportunity_applications for select to authenticated
using (candidate_id = auth.uid());

drop policy if exists "Companies can view applications to their opportunities" on public.opportunity_applications;
create policy "Companies can view applications to their opportunities"
on public.opportunity_applications for select to authenticated
using (
  exists (
    select 1
    from public.opportunities o
    join public.company_profiles c on c.id = o.company_id
    where o.id = opportunity_id and c.owner_id = auth.uid()
  )
);

drop policy if exists "Companies can update application status" on public.opportunity_applications;
create policy "Companies can update application status"
on public.opportunity_applications for update to authenticated
using (
  exists (
    select 1
    from public.opportunities o
    join public.company_profiles c on c.id = o.company_id
    where o.id = opportunity_id and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.opportunities o
    join public.company_profiles c on c.id = o.company_id
    where o.id = opportunity_id and c.owner_id = auth.uid()
  )
);

drop policy if exists "Platform admins can manage applications" on public.opportunity_applications;
create policy "Platform admins can manage applications"
on public.opportunity_applications for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());
