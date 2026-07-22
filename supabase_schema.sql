-- ============================================================
-- Pi MVP Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  role text,                        -- Entrepreneur, Engineer, Creator, etc.
  location text,
  website text,
  skills text[],
  interests text[],
  goals text[],
  ai_summary text,
  followers_count int default 0,
  following_count int default 0,
  posts_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    lower(replace(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), ' ', '_')),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. FOLLOWS
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);
alter table public.follows enable row level security;
create policy "Follows viewable by everyone" on public.follows for select using (true);
create policy "Users manage own follows" on public.follows for all using (auth.uid() = follower_id);

-- 3. COMMUNITIES
create table if not exists public.communities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  category text,
  icon text,
  cover_url text,
  creator_id uuid references public.profiles(id) on delete set null,
  members_count int default 0,
  posts_count int default 0,
  is_public boolean default true,
  created_at timestamptz default now()
);
alter table public.communities enable row level security;
create policy "Communities viewable by everyone" on public.communities for select using (true);
create policy "Authenticated users can create communities" on public.communities for insert with check (auth.role() = 'authenticated');

-- 4. COMMUNITY MEMBERS
create table if not exists public.community_members (
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member',       -- member, moderator, admin
  joined_at timestamptz default now(),
  primary key (community_id, user_id)
);
alter table public.community_members enable row level security;
create policy "Memberships viewable by everyone" on public.community_members for select using (true);
create policy "Users manage own memberships" on public.community_members for all using (auth.uid() = user_id);

-- 5. POSTS
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  community_id uuid references public.communities(id) on delete cascade,
  content text not null,
  image_url text,
  likes_count int default 0,
  comments_count int default 0,
  shares_count int default 0,
  is_pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.posts enable row level security;
create policy "Posts viewable by everyone" on public.posts for select using (true);
create policy "Users can create posts" on public.posts for insert with check (auth.uid() = author_id);
create policy "Users can update own posts" on public.posts for update using (auth.uid() = author_id);
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = author_id);

-- 6. LIKES
create table if not exists public.likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
alter table public.likes enable row level security;
create policy "Likes viewable by everyone" on public.likes for select using (true);
create policy "Users manage own likes" on public.likes for all using (auth.uid() = user_id);

-- Auto update likes_count
create or replace function public.update_post_likes_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set likes_count = likes_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists on_like_change on public.likes;
create trigger on_like_change after insert or delete on public.likes
  for each row execute procedure public.update_post_likes_count();

-- 7. COMMENTS
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);
alter table public.comments enable row level security;
create policy "Comments viewable by everyone" on public.comments for select using (true);
create policy "Users can create comments" on public.comments for insert with check (auth.uid() = author_id);
create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = author_id);

-- Auto update comments_count
create or replace function public.update_post_comments_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set comments_count = comments_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists on_comment_change on public.comments;
create trigger on_comment_change after insert or delete on public.comments
  for each row execute procedure public.update_post_comments_count();

-- 8. MESSAGES
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create policy "Users can view their own messages" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can send messages" on public.messages
  for insert with check (auth.uid() = sender_id);
create policy "Users can mark messages read" on public.messages
  for update using (auth.uid() = receiver_id);

-- 9. NOTIFICATIONS
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null,               -- like, comment, follow, message
  post_id uuid references public.posts(id) on delete cascade,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "Users view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "System can insert notifications" on public.notifications for insert with check (true);
create policy "Users can mark notifications read" on public.notifications for update using (auth.uid() = user_id);

-- 10. SEED COMMUNITIES
insert into public.communities (name, description, category, icon, members_count) values
  ('AI Founders Hub', 'A community for AI startup founders building the future.', 'Technology', '🤖', 24500),
  ('Global Startup Network', 'Connect with startup founders and builders worldwide.', 'Business', '🌐', 61200),
  ('Creator Economy Lab', 'Creators building products, audiences, and income streams.', 'Creator', '✨', 18300),
  ('Web3 Builders', 'Builders, developers, and founders in the web3 space.', 'Technology', '⛓️', 9700),
  ('Design Systems Guild', 'UI/UX designers sharing systems, patterns, and tools.', 'Design', '🎨', 12100),
  ('Venture Capital Forum', 'Investors and founders discussing deals and opportunities.', 'Finance', '💰', 7400),
  ('Health Tech Innovators', 'Building the future of healthcare through technology.', 'Health', '🧬', 5800),
  ('Music Production Network', 'Musicians, producers, and audio engineers connecting.', 'Music', '🎵', 31000)
on conflict do nothing;

-- Add experience column to profiles (run this in Supabase SQL Editor if not already done)
alter table public.profiles add column if not exists experience jsonb default '[]'::jsonb;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.comments;
