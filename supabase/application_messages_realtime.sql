-- Ativa eventos em tempo real para mensagens e recibos de leitura.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'application_messages'
  ) then
    alter publication supabase_realtime add table public.application_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'application_message_reads'
  ) then
    alter publication supabase_realtime add table public.application_message_reads;
  end if;
end $$;
