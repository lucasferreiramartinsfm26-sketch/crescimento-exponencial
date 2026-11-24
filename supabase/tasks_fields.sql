-- Compatibilidade da tabela de tarefas com os campos usados pelo aplicativo.
-- Seguro para bases existentes: adiciona somente colunas ausentes e preserva os registros.
begin;

alter table public.tasks
  add column if not exists priority text not null default 'Média',
  add column if not exists due_date date,
  add column if not exists progress integer not null default 0,
  add column if not exists reminder_days integer not null default 3;

commit;
