-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: when an event becomes published with an image, send the image via Edge Function
CREATE OR REPLACE FUNCTION public.notify_event_image_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _became_published boolean;
  _has_image boolean;
BEGIN
  _has_image := NEW.image_url IS NOT NULL AND length(trim(NEW.image_url)) > 0;

  IF TG_OP = 'INSERT' THEN
    _became_published := COALESCE(NEW.is_published, false) = true;
  ELSE
    _became_published := COALESCE(NEW.is_published, false) = true
      AND COALESCE(OLD.is_published, false) = false;
  END IF;

  IF _became_published AND _has_image THEN
    PERFORM net.http_post(
      url := 'https://idufpxzvskjrwaslnsco.supabase.co/functions/v1/send-event-image',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdWZweHp2c2tqcndhc2xuc2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODQxNjcsImV4cCI6MjA4Nzk2MDE2N30.jX7py_9Kb9KWhBWl3EyMsVw4OKVoRE8HRDUakecEJ7c'
      ),
      body := jsonb_build_object('event_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_event_image_on_publish ON public.events;

CREATE TRIGGER trg_notify_event_image_on_publish
AFTER INSERT OR UPDATE OF is_published, image_url ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_event_image_on_publish();