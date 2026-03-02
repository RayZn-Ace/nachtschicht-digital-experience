ALTER TABLE public.u18_forms 
ADD COLUMN IF NOT EXISTS parent_signature text,
ADD COLUMN IF NOT EXISTS supervisor_signature text;