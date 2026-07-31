-- Pi Social — persist opportunity-feed stream on posts
-- Run in Supabase SQL Editor

alter table public.posts
  add column if not exists stream text
  check (stream is null or stream in ('knowledge', 'people', 'opportunities', 'communities'));

create index if not exists posts_stream_idx on public.posts (stream)
  where stream is not null;
