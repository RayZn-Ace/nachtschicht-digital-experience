-- Function that calls the sync-outbound edge function on events changes
CREATE OR REPLACE FUNCTION public.trigger_sync_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/sync-outbound',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-call', 'true'
    ),
    body := jsonb_build_object('type', 'events')
  );
  RETURN NEW;
END;
$$;

-- Trigger on events table
DROP TRIGGER IF EXISTS sync_events_trigger ON public.events;
CREATE TRIGGER sync_events_trigger
  AFTER INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_events();