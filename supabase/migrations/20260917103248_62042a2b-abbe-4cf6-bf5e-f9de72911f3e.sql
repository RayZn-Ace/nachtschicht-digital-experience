ALTER TABLE public.event_lounges
  ADD COLUMN IF NOT EXISTS min_spend_override numeric,
  ADD COLUMN IF NOT EXISTS price_per_person_override numeric,
  ADD COLUMN IF NOT EXISTS price_note text;