-- Allow senders to delete their own messages (for chat context menu Delete)
drop policy if exists "Users can delete own messages" on public.messages;
create policy "Users can delete own messages"
  on public.messages for delete
  using (auth.uid() = sender_id);

-- Allow senders to soft-update own message content (e.g. mark deleted)
drop policy if exists "Users can update own sent messages" on public.messages;
create policy "Users can update own sent messages"
  on public.messages for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

notify pgrst, 'reload schema';
