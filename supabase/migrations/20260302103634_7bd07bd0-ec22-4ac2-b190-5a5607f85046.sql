
-- Create photo_reports table
CREATE TABLE public.photo_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.album_photos(id) ON DELETE CASCADE,
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  detail_text text,
  verification_photo_url text,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.photo_reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can submit a report
CREATE POLICY "Authenticated users can submit reports"
  ON public.photo_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON public.photo_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can manage all reports"
  ON public.photo_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for verification photos
INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload report photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view report photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own report photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
