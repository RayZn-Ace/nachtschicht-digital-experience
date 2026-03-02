
-- Create genres table for custom genre management
CREATE TABLE IF NOT EXISTS public.genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view genres" ON public.genres FOR SELECT USING (true);
CREATE POLICY "Admins can manage genres" ON public.genres FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default genres
INSERT INTO public.genres (name, is_default) VALUES
  ('Mixed', true),
  ('Black', true),
  ('Russian', true),
  ('90er', true),
  ('Schlager/Ballermann', true),
  ('Deutschrap', true),
  ('Ü30', true)
ON CONFLICT (name) DO NOTHING;

-- Add vat_rate column to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 19;

-- Create event-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event-images
CREATE POLICY "Anyone can view event images" ON storage.objects FOR SELECT USING (bucket_id = 'event-images');
CREATE POLICY "Admins can upload event images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete event images" ON storage.objects FOR DELETE USING (bucket_id = 'event-images' AND has_role(auth.uid(), 'admin'::app_role));
