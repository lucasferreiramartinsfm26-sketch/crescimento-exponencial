# Crescimento Exponencial

Aplicativo web responsivo para desenvolvimento pessoal e organização de metas, tarefas e prazos, com área de oportunidades profissionais, cadastro e aprovação de empresas, candidaturas, mensagens privadas e painel administrativo.

## Aplicativo publicado

https://lucasferreiramartinsfm26-sketch.github.io/crescimento-exponencial/

## Funcionalidades

- Cadastro, login e recuperação de sessão pelo Supabase Auth.
- Metas, tarefas, acompanhamento de progresso, calendário e lembretes.
- Área de empresas com cadastro sujeito à aprovação.
- Publicação de oportunidades sujeita à aprovação administrativa.
- Busca e filtro de oportunidades.
- Candidaturas e acompanhamento de status.
- Caixa de entrada com contagem de mensagens não lidas.
- Conversas privadas por candidatura, com atualização em tempo real.
- Central de notificações para empresas, com atualização automática e opção de marcar avisos como lidos.
- Painel administrativo para aprovar, rejeitar e suspender empresas e oportunidades, além de analisar denúncias.

## Configuração do Supabase

O cliente Supabase está configurado em `src/lib/supabase.js` com URL do projeto e chave pública (publishable/anon). A chave pública pode estar no navegador; nunca coloque uma chave `service_role` no frontend.

Para montar uma nova instância, execute os scripts SQL no SQL Editor do Supabase, nesta ordem:

1. `supabase/schema.sql`
2. `supabase/tasks_fields.sql` (compatibilidade com a tabela de tarefas existente)
3. `supabase/platform_schema.sql`
3. `supabase/company_registration_fields.sql`
4. `supabase/company_notifications.sql`
6. `supabase/opportunity_applications.sql`
7. `supabase/launch_security_hardening.sql` (proteção adicional das candidaturas)
8. `supabase/application_messages.sql`
9. `supabase/application_message_reads.sql`
10. `supabase/application_messages_realtime.sql`

Depois, cadastre a conta responsável pela administração em `public.platform_admins` pelo SQL Editor. Use o e-mail da conta que fará login:

```sql
insert into public.platform_admins (user_id)
select id
from auth.users
where lower(email) = lower('SEU_EMAIL_DE_ADMIN')
on conflict (user_id) do nothing;
```

Os scripts usam `create table if not exists`, `add column if not exists` e políticas recriadas de forma idempotente; ainda assim, faça backup antes de aplicar mudanças em uma instância que já tenha dados. Na instalação existente, execute as migrações adicionais indicadas acima no SQL Editor.

## Desenvolvimento local

1. Instale Node.js 22 ou superior.
2. Execute `npm install`.
3. Confira a configuração do projeto Supabase em `src/lib/supabase.js`.
4. Execute `npm run dev`.

Para validar a compilação:

```bash
npm run build
```

## Publicação

O GitHub Actions compila o projeto e publica automaticamente no GitHub Pages a cada atualização na branch `main`. Também é possível iniciar a publicação manualmente pela aba **Actions** do GitHub.

## Segurança e observações

- A autorização de acesso aos dados é aplicada no Supabase por Row Level Security (RLS).
- O painel administrativo depende do registro da conta em `platform_admins`; esconder a opção na interface não substitui as políticas do banco.
- A caixa de mensagens e os recibos de leitura usam as tabelas `application_messages` e `application_message_reads`.
- A Central de notificações atualiza automaticamente quando a página está aberta e também pode ser atualizada manualmente.
- A publicação bem-sucedida confirma a compilação e o deploy; testes finais de autenticação e fluxos com contas reais devem ser feitos no próprio aplicativo.
