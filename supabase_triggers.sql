-- ============================================================
-- Pi MVP — Notification + follow-count triggers (OPTIONAL)
-- Run in Supabase SQL Editor after the base schema.
--
-- If you apply these triggers, remove client-side notification
-- calls in FeedPage / MessagingPage / ProfilePage to avoid
-- duplicate notifications. Client-side helpers work without this.
-- ============================================================

-- Prefer security-definer so RLS does not block trigger inserts
create or replace function public.create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_post_id uuid,
  p_message text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is null or p_actor_id is null or p_user_id = p_actor_id then
    return;
  end if;
  insert into public.notifications (user_id, actor_id, type, post_id, message)
  values (p_user_id, p_actor_id, p_type, p_post_id, p_message);
end;
$$;

-- Likes → notify post author
create or replace function public.notify_on_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  author uuid;
  actor_name text;
begin
  select author_id into author from public.posts where id = new.post_id;
  select coalesce(full_name, username, 'Someone') into actor_name from public.profiles where id = new.user_id;
  perform public.create_notification(author, new.user_id, 'like', new.post_id, actor_name || ' liked your post');
  return new;
end;
$$;
drop trigger if exists on_like_notify on public.likes;
create trigger on_like_notify after insert on public.likes
  for each row execute procedure public.notify_on_like();

-- Comments → notify post author
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  author uuid;
  actor_name text;
begin
  select author_id into author from public.posts where id = new.post_id;
  select coalesce(full_name, username, 'Someone') into actor_name from public.profiles where id = new.author_id;
  perform public.create_notification(author, new.author_id, 'comment', new.post_id, actor_name || ' commented on your post');
  return new;
end;
$$;
drop trigger if exists on_comment_notify on public.comments;
create trigger on_comment_notify after insert on public.comments
  for each row execute procedure public.notify_on_comment();

-- Messages → notify receiver
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor_name text;
begin
  select coalesce(full_name, username, 'Someone') into actor_name from public.profiles where id = new.sender_id;
  perform public.create_notification(new.receiver_id, new.sender_id, 'message', null, actor_name || ' sent you a message');
  return new;
end;
$$;
drop trigger if exists on_message_notify on public.messages;
create trigger on_message_notify after insert on public.messages
  for each row execute procedure public.notify_on_message();

-- Follows → notify + update counts
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor_name text;
begin
  select coalesce(full_name, username, 'Someone') into actor_name from public.profiles where id = new.follower_id;
  perform public.create_notification(new.following_id, new.follower_id, 'follow', null, actor_name || ' started following you');

  update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
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
