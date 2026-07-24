-- ============================================================
-- Pi feed post images — run once in Supabase SQL Editor
-- Creates a PUBLIC bucket "post-images" (max 8 MB per image)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Post images are publicly accessible" on storage.objects;
create policy "Post images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "Users can upload post images" on storage.objects;
create policy "Users can upload post images"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own post images" on storage.objects;
create policy "Users can update own post images"
  on storage.objects for update
  using (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own post images" on storage.objects;
create policy "Users can delete own post images"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
