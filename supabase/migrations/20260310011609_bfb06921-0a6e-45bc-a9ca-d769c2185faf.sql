ALTER TABLE public.events
  ADD COLUMN insurance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN insurance_amount numeric NOT NULL DEFAULT 0;