-- Allow authors to edit their own comments
alter table public.comments add column if not exists updated_at timestamptz;

drop policy if exists "Users can update own comments" on public.comments;
create policy "Users can update own comments"
  on public.comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
