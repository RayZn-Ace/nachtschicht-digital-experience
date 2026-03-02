ALTER TABLE public.u18_forms
  ADD COLUMN IF NOT EXISTS parent_zip text DEFAULT '',
  ADD COLUMN IF NOT EXISTS parent_city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS minor_zip text DEFAULT '',
  ADD COLUMN IF NOT EXISTS minor_city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_zip text,
  ADD COLUMN IF NOT EXISTS supervisor_city text,
  ADD COLUMN IF NOT EXISTS has_supervisor_signature boolean NOT NULL DEFAULT false;