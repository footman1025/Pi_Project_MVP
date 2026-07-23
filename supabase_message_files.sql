-- ============================================================
-- Pi chat file attachments — run once in Supabase SQL Editor
-- Creates a PUBLIC bucket "message-files" (max 10 MB per file)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-files',
  'message-files',
  true,
  10485760,
  null
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760;

-- Anyone with the URL can view (needed so chat partners can open files)
drop policy if exists "Message files are publicly accessible" on storage.objects;
create policy "Message files are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'message-files');

-- Authenticated users upload only into their own folder: {user_id}/...
drop policy if exists "Users can upload message files" on storage.objects;
create policy "Users can upload message files"
  on storage.objects for insert
  with check (
    bucket_id = 'message-files'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own message files" on storage.objects;
create policy "Users can update own message files"
  on storage.objects for update
  using (
    bucket_id = 'message-files'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own message files" on storage.objects;
create policy "Users can delete own message files"
  on storage.objects for delete
  using (
    bucket_id = 'message-files'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
