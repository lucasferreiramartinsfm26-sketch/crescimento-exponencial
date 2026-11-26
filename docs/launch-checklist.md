# Checklist de lançamento — Crescimento Exponencial

Este documento acompanha a preparação do lançamento inicial (MVP). Não representa uma certificação de segurança ou uma garantia de disponibilidade.

## Já verificado

- [x] Projeto compila e o GitHub Actions concluiu o deploy da versão mais recente.
- [ ] Concluir e registrar os testes funcionais de candidato, empresa e administrador; não é necessário criar uma segunda conta para continuar a revisão técnica.
- [x] Ajustes recentes de navegação e validação foram enviados ao repositório.
- [x] Página inicial recebeu título e metadados de compartilhamento.

## Antes de divulgar publicamente

- [ ] Confirmar no aplicativo publicado o cadastro, login e recuperação de senha.
- [ ] Fazer um teste completo com uma conta de candidato: perfil, busca, candidatura e mensagens.
- [x] Responsável confirmou que a edição do cadastro de empresa aprovada salva corretamente.
- [ ] Fazer um teste completo com uma conta de empresa: cadastro/aprovação, publicação e resposta a candidaturas.
- [ ] Fazer um teste com administrador: aprovação, rejeição e moderação.
- [x] Responsável confirmou que `tasks_fields.sql` e `launch_security_hardening.sql` foram executados com sucesso no Supabase.
- [ ] Revisar as políticas RLS e permissões do banco com resultados verificáveis.
- [ ] Revisar juridicamente e validar a Política de Privacidade e os Termos publicados, especialmente retenção, exclusão em cascata, fornecedores e direitos dos titulares.
- [x] Fluxo de exclusão da conta implantado e confirmação por frase verificada na interface; falta validar a exclusão dos registros relacionados no banco remoto sem apagar conta real.
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


## Identificação do responsável

- [x] Definido: o aplicativo será operado em nome do responsável como pessoa física.
- [x] Nome informado para identificação: Lucas Ferreira Martins (nome civil completo confirmado pelo responsável).
- [ ] Conferir os dados de identificação exigidos nos documentos, após revisão jurídica.
- [x] Contato oficial de suporte e privacidade definido: lucasferreiramartinsfm26@gmail.com.
