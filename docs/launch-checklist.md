# Checklist de lançamento — Crescimento Exponencial

Este documento acompanha a preparação do lançamento inicial (MVP). Não representa uma certificação de segurança ou uma garantia de disponibilidade.

## Já verificado

- [x] Projeto compila e o GitHub Actions concluiu o deploy da versão mais recente.
- [x] Fluxos principais foram testados pelo responsável no aplicativo: candidato, empresa e administrador.
- [x] Ajustes recentes de navegação e validação foram enviados ao repositório.
- [x] Página inicial recebeu título e metadados de compartilhamento.

## Antes de divulgar publicamente

- [ ] Confirmar no aplicativo publicado o cadastro, login e recuperação de senha.
- [ ] Fazer um teste completo com uma conta de candidato: perfil, busca, candidatura e mensagens.
- [ ] Fazer um teste completo com uma conta de empresa: cadastro/aprovação, publicação e resposta a candidaturas.
- [ ] Fazer um teste com administrador: aprovação, rejeição e moderação.
- [ ] Confirmar no Supabase que as migrações `tasks_fields.sql` e `launch_security_hardening.sql` foram aplicadas sem erros.
- [ ] Revisar as políticas RLS e permissões do banco com resultados verificáveis.
- [ ] Publicar Política de Privacidade e Termos de Uso, com informações reais sobre dados coletados, finalidade, retenção, contato e direitos dos titulares.
- [ ] Definir um canal de suporte e um procedimento para receber e tratar solicitações.
- [ ] Definir como serão feitos e testados os backups dos dados do serviço.
- [ ] Conferir o aplicativo em celular e computador, incluindo mensagens de erro e telas vazias.

## Escopo do primeiro lançamento

- Manter o conjunto atual de funcionalidades; novas funcionalidades ficam congeladas durante a finalização.
- Disponibilizar a experiência gratuita prevista para o MVP.
- A assinatura Premium de R$ 19,90/mês permanece planejada para uma etapa posterior; não anunciar cobrança nem recursos pagos como ativos até que acesso, pagamento e cancelamento estejam implementados e testados.

## Publicação

Aplicativo: https://lucasferreiramartinsfm26-sketch.github.io/crescimento-exponencial/

Repositório e histórico de publicação: https://github.com/lucasferreiramartinsfm26-sketch/crescimento-exponencial/actions

## Critério para liberar a divulgação

Divulgar amplamente somente depois de concluir os itens obrigatórios da seção “Antes de divulgar publicamente”. A compilação e o deploy bem-sucedidos, isoladamente, não comprovam a segurança do banco nem a conformidade jurídica.
