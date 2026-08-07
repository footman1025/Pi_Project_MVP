-- ============================================================
-- Pi follows — fix RLS + keep follower counts in sync
-- Run once in Supabase SQL Editor
-- ============================================================

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

alter table public.follows enable row level security;

-- Replace vague FOR ALL policy with explicit select/insert/delete
drop policy if exists "Users manage own follows" on public.follows;
drop policy if exists "Follows viewable by everyone" on public.follows;
drop policy if exists "Users can view follows" on public.follows;
drop policy if exists "Users can insert own follows" on public.follows;
drop policy if exists "Users can delete own follows" on public.follows;

create policy "Users can view follows"
  on public.follows for select
  using (true);

create policy "Users can insert own follows"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can delete own follows"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- Keep cached counts on profiles in sync (no notification insert — app owns that)
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
    set following_count = coalesce(following_count, 0) + 1
    where id = new.follower_id;

  update public.profiles
    set followers_count = coalesce(followers_count, 0) + 1
    where id = new.following_id;

  return new;
end;
$$;

create or replace function public.on_unfollow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
    set following_count = greatest(coalesce(following_count, 0) - 1, 0)
    where id = old.follower_id;

  update public.profiles
    set followers_count = greatest(coalesce(followers_count, 0) - 1, 0)
    where id = old.following_id;

  return old;
end;
$$;

drop trigger if exists on_follow_notify on public.follows;
create trigger on_follow_notify
  after insert on public.follows
  for each row execute procedure public.notify_on_follow();

drop trigger if exists on_unfollow on public.follows;
create trigger on_unfollow
  after delete on public.follows
  for each row execute procedure public.on_unfollow();

-- Recompute counts from the follows table (one-time repair)
update public.profiles p set
  followers_count = (
    select count(*)::int from public.follows f where f.following_id = p.id
  ),
  following_count = (
    select count(*)::int from public.follows f where f.follower_id = p.id
  );

notify pgrst, 'reload schema';
