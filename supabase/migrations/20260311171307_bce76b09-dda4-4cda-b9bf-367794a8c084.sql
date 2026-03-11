DROP TRIGGER IF EXISTS sync_events_trigger ON public.events;
DROP FUNCTION IF EXISTS public.trigger_sync_events();