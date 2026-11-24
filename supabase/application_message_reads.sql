-- Caixa de entrada e confirmação de leitura sincronizada entre dispositivos.
create table if not exists public.application_message_reads (
  application_id uuid not null references public.opportunity_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (application_id, user_id)
);

create index if not exists application_message_reads_user_idx
  on public.application_message_reads(user_id, last_read_at desc);

alter table public.application_message_reads enable row level security;

drop policy if exists "Participants can read message read receipts" on public.application_message_reads;
create policy "Participants can read message read receipts"
on public.application_message_reads for select to authenticated
using (
  user_id = auth.uid()
  and (
    exists (
      select 1 from public.opportunity_applications a
      join public.opportunities o on o.id = a.opportunity_id
      join public.company_profiles c on c.id = o.company_id
      where a.id = application_id
        and (a.candidate_id = auth.uid() or c.owner_id = auth.uid())
    )
    or public.is_platform_admin()
  )
);

drop policy if exists "Participants can create message read receipts" on public.application_message_reads;
create policy "Participants can create message read receipts"
on public.application_message_reads for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.opportunity_applications a
    join public.opportunities o on o.id = a.opportunity_id
    join public.company_profiles c on c.id = o.company_id
    where a.id = application_id
      and (a.candidate_id = auth.uid() or c.owner_id = auth.uid())
  )
);

drop policy if exists "Participants can update message read receipts" on public.application_message_reads;
create policy "Participants can update message read receipts"
on public.application_message_reads for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.opportunity_applications a
    join public.opportunities o on o.id = a.opportunity_id
    join public.company_profiles c on c.id = o.company_id
    where a.id = application_id
      and (a.candidate_id = auth.uid() or c.owner_id = auth.uid())
  )
)
with check (user_id = auth.uid());
