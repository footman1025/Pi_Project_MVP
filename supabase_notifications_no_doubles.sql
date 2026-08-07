-- ============================================================
-- Pi — stop double notifications
-- Triggers were inserting the same events the app also inserts.
-- Keep follower/posts counts; remove notification inserts from triggers.
-- Safe to re-run.
-- ============================================================

-- Likes: no notification (client createNotification handles + push)
create or replace function public.notify_on_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  return new;
end;
$$;

-- Comments: no notification
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  return new;
end;
$$;

-- Messages: no notification (client coalesces unread + push)
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  return new;
end;
$$;

-- Follows: keep counts only — no notification insert
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
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

-- Drop notify triggers that duplicated client inserts
drop trigger if exists on_like_notify on public.likes;
drop trigger if exists on_comment_notify on public.comments;
drop trigger if exists on_message_notify on public.messages;
-- Keep on_follow_notify for counts only (function above no longer inserts notifications)

-- Allow recipients to delete their own notification rows (dedupe cleanup)
drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
