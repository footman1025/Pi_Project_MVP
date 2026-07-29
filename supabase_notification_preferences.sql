-- Notification preferences: email opt-in (cellphone = Web Push / PWA)
-- Run in Supabase SQL Editor.

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default false,
  email text,
  push_enabled boolean not null default true,
  updated_at timestamptz default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users manage own notification preferences" on public.notification_preferences;
create policy "Users manage own notification preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role reads prefs when sending email from /api/email
drop policy if exists "Service can read notification preferences" on public.notification_preferences;
-- (service role bypasses RLS by default)
