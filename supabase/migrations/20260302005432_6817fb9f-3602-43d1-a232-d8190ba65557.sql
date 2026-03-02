
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS billing_name text,
  ADD COLUMN IF NOT EXISTS billing_street text,
  ADD COLUMN IF NOT EXISTS billing_zip text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'Deutschland';
