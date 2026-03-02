ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_focus_x integer DEFAULT 50;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_focus_y integer DEFAULT 50;