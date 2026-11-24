# Crescimento Exponencial

Aplicativo web responsivo para organizar tarefas e acompanhar metas pessoais.

## Executar localmente
1. Instale Node.js.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local` e preencha as credenciais do Supabase (opcional para a demonstração local).
4. Execute `npm run dev`.

## Supabase
O arquivo `supabase/schema.sql` cria a tabela de tarefas com políticas de segurança por usuário (RLS). O painel atual mantém os dados no navegador; a integração de autenticação e sincronização com Supabase é a próxima etapa.

## Publicação
Pode ser publicado gratuitamente em serviços de hospedagem estática compatíveis com Vite, como GitHub Pages ou Cloudflare Pages.
