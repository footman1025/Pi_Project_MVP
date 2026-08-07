-- ============================================================
-- Pi MVP — follow / post count triggers
-- Notifications are created by the app (src/lib/notifications.ts)
-- so they can dedupe + send push/email once. Do NOT insert
-- notifications from triggers (causes doubles).
-- Prefer: supabase_notifications_no_doubles.sql if old notify
-- triggers are already installed.
-- ============================================================

-- Likes / comments / messages: no notification triggers
drop trigger if exists on_like_notify on public.likes;
drop trigger if exists on_comment_notify on public.comments;
drop trigger if exists on_message_notify on public.messages;

-- Follows → update counts only (client sends the follow notification)
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set following_count = coalesce(following_count, 0) + 1 where id = new.follower_id;
  update public.profiles set followers_count = coalesce(followers_count, 0) + 1 where id = new.following_id;
  return new;
end;
$$;
drop trigger if exists on_follow_notify on public.follows;
create trigger on_follow_notify after insert on public.follows
  for each row execute procedure public.notify_on_follow();

create or replace function public.on_unfollow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  update public.profiles set followers_count = greatest(followers_count - 1, 0) where id = old.following_id;
  return old;
end;
$$;
drop trigger if exists on_unfollow on public.follows;
create trigger on_unfollow after delete on public.follows
  for each row execute procedure public.on_unfollow();

-- Keep posts_count in sync
create or replace function public.update_profile_posts_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
  elsif TG_OP = 'DELETE' then
    update public.profiles set posts_count = greatest(posts_count - 1, 0) where id = old.author_id;
  end if;
  return null;
end;
$$;
drop trigger if exists on_post_count on public.posts;
create trigger on_post_count after insert or delete on public.posts
  for each row execute procedure public.update_profile_posts_count();
