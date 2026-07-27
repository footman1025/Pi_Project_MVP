-- Push subscriptions for Web Push (phones / tablets / desktops)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow service role / authenticated insert from own user (covered by above)

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);
