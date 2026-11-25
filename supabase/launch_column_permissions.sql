-- Permissões mínimas de atualização para o lançamento.
-- Mantém o RLS existente e as operações usadas atualmente pelo aplicativo.
-- Execute no SQL Editor do Supabase após revisar o conteúdo.

begin;

-- TRUNCATE não é protegido por RLS; usuários autenticados não precisam dele.
revoke truncate on table
  public.application_message_reads,
  public.company_notifications,
  public.company_profiles,
  public.opportunities,
  public.opportunity_applications
from authenticated;

-- Remove UPDATE amplo e concede somente as colunas usadas pelo aplicativo.
revoke update on table public.application_message_reads from authenticated;
revoke update on table public.company_notifications from authenticated;
revoke update on table public.company_profiles from authenticated;
revoke update on table public.opportunities from authenticated;

-- A interface atualiza somente o horário da última leitura.
grant update (last_read_at)
on table public.application_message_reads to authenticated;

-- A interface permite marcar notificações como lidas.
grant update (read)
on table public.company_notifications to authenticated;

-- A empresa proprietária pode editar seus dados cadastrais enquanto pendente ou aprovada.
-- A trigger protect_company_status impede que a empresa altere o status; somente admin pode fazê-lo.
grant update (name, cnpj, email, phone, website, description, status, updated_at)
on table public.company_profiles to authenticated;

-- No aplicativo atual, a administração altera status e updated_at.
-- A empresa envia novas oportunidades; não há edição de oportunidade na interface atual.
grant update (status, updated_at)
on table public.opportunities to authenticated;

-- opportunity_applications já deve manter UPDATE apenas em status e updated_at.
-- Não alterar essa concessão neste script.

commit;
