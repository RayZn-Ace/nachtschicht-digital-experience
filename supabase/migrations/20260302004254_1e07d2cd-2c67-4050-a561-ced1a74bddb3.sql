
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS subtitle text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS end_time text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_muttizettel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_abendkasse boolean NOT NULL DEFAULT false;
