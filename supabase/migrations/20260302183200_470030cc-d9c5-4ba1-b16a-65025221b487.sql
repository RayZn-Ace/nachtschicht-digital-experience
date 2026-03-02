ALTER TABLE public.events ADD COLUMN IF NOT EXISTS newsletter_banner_url text;

-- Create storage bucket for newsletter banners
INSERT INTO storage.buckets (id, name, public) VALUES ('newsletter-banners', 'newsletter-banners', true) ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read newsletter banners" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'newsletter-banners');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload newsletter banners" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'newsletter-banners');

-- Allow authenticated users to update/delete
CREATE POLICY "Authenticated manage newsletter banners" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'newsletter-banners');
CREATE POLICY "Authenticated delete newsletter banners" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'newsletter-banners');