-- Central de notificações para empresas
create table if not exists public.company_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.company_notifications enable row level security;
drop policy if exists "Users can read their company notifications" on public.company_notifications;
create policy "Users can read their company notifications" on public.company_notifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can update their company notifications" on public.company_notifications;
create policy "Users can update their company notifications" on public.company_notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Platform admins can insert company notifications" on public.company_notifications;
create policy "Platform admins can insert company notifications" on public.company_notifications for insert to authenticated with check (public.is_platform_admin());
create index if not exists company_notifications_user_created_idx on public.company_notifications (user_id, created_at desc);
