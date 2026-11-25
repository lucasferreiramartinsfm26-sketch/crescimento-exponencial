# Implantação segura da exclusão de conta

Esta função exclui somente a conta autenticada que faz a chamada. A confirmação textual obrigatória é `DELETE_MY_ACCOUNT`. A função valida o token do usuário e executa a exclusão com a chave administrativa exclusivamente no ambiente do servidor.

## 1. Configurar o segredo no Supabase

1. Abra o projeto: https://supabase.com/dashboard/project/wxjhxheonexietlkqlke
2. Entre em **Edge Functions → Secrets**.
3. Adicione `SERVICE_ROLE_KEY` com o valor da chave secreta administrativa do projeto.
4. Não coloque essa chave em `src/`, no GitHub, no navegador ou em mensagens.
5. O ambiente Edge Functions fornece `SUPABASE_URL` e `SUPABASE_ANON_KEY`; confirme que estão disponíveis.

## 2. Implantar a função

Implante a pasta `supabase/functions/delete-account` com o nome `delete-account` usando Supabase CLI ou o editor de Edge Functions. Mantenha a verificação JWT habilitada. A função exige uma sessão válida e confirmação explícita no corpo da requisição.

## 3. Dependências e comportamento

A exclusão usa `auth.admin.deleteUser(user.id)`. As tabelas do projeto foram definidas com referências em cascata para os dados vinculados à conta: tarefas, perfis de empresa, oportunidades, candidaturas, mensagens, leituras, notificações, denúncias e registro de administrador. O banco efetivo deve ser conferido antes da ativação, pois restrições ou tabelas criadas fora dos arquivos do repositório podem impedir ou alterar a exclusão.

## 4. Teste obrigatório antes de ativar no aplicativo

- Criar uma conta de teste sem dados reais.
- Confirmar que uma chamada sem token recebe 401.
- Confirmar que uma chamada sem o texto de confirmação recebe 400.
- Confirmar que o usuário autenticado consegue excluir apenas a própria conta.
- Verificar no Supabase Auth que a conta de teste foi removida.
- Verificar as tabelas relacionadas e testar o fluxo de erro.
- Só depois integrar o botão de exclusão na interface pública.

**Status:** código versionado; função ainda não implantada nem testada no projeto remoto. Não anunciar exclusão automática até concluir os passos acima.
