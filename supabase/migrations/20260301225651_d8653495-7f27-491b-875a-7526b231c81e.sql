
-- Albums table
CREATE TABLE public.albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  cover_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Album photos table
CREATE TABLE public.album_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS on albums
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published albums viewable by everyone"
  ON public.albums FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage albums"
  ON public.albums FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS on album_photos
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos of published albums viewable by everyone"
  ON public.album_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.albums WHERE albums.id = album_photos.album_id AND albums.is_published = true));

CREATE POLICY "Admins can manage album photos"
  ON public.album_photos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for album media
INSERT INTO storage.buckets (id, name, public) VALUES ('albums', 'albums', true);

-- Storage policies
CREATE POLICY "Anyone can view album files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'albums');

CREATE POLICY "Admins can upload album files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'albums' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete album files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'albums' AND has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger for albums
CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
