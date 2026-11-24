-- Campos complementares para cadastro de empresas.
-- Seguro para executar após platform_schema.sql: não apaga nem altera registros existentes.
alter table public.company_profiles
  add column if not exists cnpj text,
  add column if not exists phone text;

create index if not exists company_profiles_cnpj_idx
  on public.company_profiles(cnpj)
  where cnpj is not null and cnpj <> '';
