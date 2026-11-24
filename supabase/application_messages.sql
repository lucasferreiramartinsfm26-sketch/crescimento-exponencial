-- Central de mensagens privadas entre candidatos e empresas
create table if not exists public.application_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.opportunity_applications(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists application_messages_thread_idx
  on public.application_messages(application_id, created_at);

alter table public.application_messages enable row level security;

drop policy if exists "Participants can read application messages" on public.application_messages;
create policy "Participants can read application messages"
on public.application_messages for select to authenticated
using (
  exists (
    select 1
    from public.opportunity_applications a
    join public.opportunities o on o.id = a.opportunity_id
    join public.company_profiles c on c.id = o.company_id
    where a.id = application_id
      and (a.candidate_id = auth.uid() or c.owner_id = auth.uid())
  )
  or public.is_platform_admin()
);

drop policy if exists "Participants can send application messages" on public.application_messages;
create policy "Participants can send application messages"
on public.application_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.opportunity_applications a
    join public.opportunities o on o.id = a.opportunity_id
    join public.company_profiles c on c.id = o.company_id
    where a.id = application_id
      and (a.candidate_id = auth.uid() or c.owner_id = auth.uid())
  )
);
