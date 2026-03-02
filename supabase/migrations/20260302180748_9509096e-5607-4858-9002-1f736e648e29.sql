
-- Step 1: Clear existing subscriber-category assignments that reference newsletter_categories
DELETE FROM public.newsletter_subscriber_categories;

-- Step 2: Drop the old FK
ALTER TABLE public.newsletter_subscriber_categories
  DROP CONSTRAINT IF EXISTS newsletter_subscriber_categories_category_id_fkey;

-- Step 3: Add new FK to event_tags with CASCADE delete
ALTER TABLE public.newsletter_subscriber_categories
  ADD CONSTRAINT newsletter_subscriber_categories_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.event_tags(id) ON DELETE CASCADE;

-- Step 4: Create trigger function to auto-add ticket buyers to newsletter categories based on event tags
CREATE OR REPLACE FUNCTION public.auto_tag_ticket_buyer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _sub_id uuid;
  _tag_id uuid;
BEGIN
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.newsletter_subscribers (email, name, is_active)
  VALUES (NEW.buyer_email, NEW.buyer_name, true)
  ON CONFLICT (email) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, newsletter_subscribers.name)
  RETURNING id INTO _sub_id;

  FOR _tag_id IN
    SELECT tag_id FROM public.event_tag_assignments WHERE event_id = NEW.event_id
  LOOP
    INSERT INTO public.newsletter_subscriber_categories (subscriber_id, category_id)
    VALUES (_sub_id, _tag_id)
    ON CONFLICT (subscriber_id, category_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Step 5: Create the trigger on tickets table
DROP TRIGGER IF EXISTS trg_auto_tag_ticket_buyer ON public.tickets;
CREATE TRIGGER trg_auto_tag_ticket_buyer
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_tag_ticket_buyer();
