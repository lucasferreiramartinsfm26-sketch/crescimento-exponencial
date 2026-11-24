-- Reforço de segurança para candidaturas antes do lançamento.
-- Candidatos só podem criar candidaturas com status inicial pendente.
-- Empresas e administradores só podem alterar status e updated_at via API.
-- As políticas RLS existentes continuam definindo quem pode atualizar cada linha.
begin;

drop policy if exists "Candidates can apply to approved opportunities"
  on public.opportunity_applications;

create policy "Candidates can apply to approved opportunities"
on public.opportunity_applications
for insert to authenticated
with check (
  candidate_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1
    from public.opportunities o
    where o.id = opportunity_id
      and o.status = 'approved'
      and (o.deadline is null or o.deadline >= current_date)
  )
);

revoke update on table public.opportunity_applications from authenticated;
revoke update (status, updated_at) on table public.opportunity_applications from authenticated;
grant update (status, updated_at) on table public.opportunity_applications to authenticated;

commit;
