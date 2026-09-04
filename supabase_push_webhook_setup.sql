-- Optional: closed-app push when the sender’s browser never finishes /api/push.
-- After deploying /api/push-hook and setting PUSH_HOOK_SECRET on Vercel:
--
-- Supabase Dashboard → Database → Webhooks → Create a new hook
--   Table: public.notifications
--   Events: INSERT
--   Method: POST
--   URL: https://pi-project-mvp.vercel.app/api/push-hook
--   HTTP Headers: x-pi-push-secret = <same value as PUSH_HOOK_SECRET>
--
-- Also ensure each user has run “Enable push” once so push_subscriptions has a row.
-- Run supabase_push_subscriptions.sql if that table is missing.

select 1;
