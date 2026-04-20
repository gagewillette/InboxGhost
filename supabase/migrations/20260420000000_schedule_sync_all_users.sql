-- Schedule sync-all-users edge function every 30 minutes via pg_cron.
-- Requires the pg_cron extension to be enabled in your Supabase project.
select cron.schedule(
  'sync-all-users',
  '*/30 * * * *',
  $$
    select net.http_post(
      url := (select value from vault.decrypted_secrets where name = 'supabase_functions_url') || '/sync-all-users',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select value from vault.decrypted_secrets where name = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
