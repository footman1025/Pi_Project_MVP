-- Ensure authors can delete their own posts and comments
-- Safe to re-run.

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = author_id);

-- Edit comments (if not already applied via supabase_comment_edit.sql)
alter table public.comments add column if not exists updated_at timestamptz;

drop policy if exists "Users can update own comments" on public.comments;
create policy "Users can update own comments"
  on public.comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
