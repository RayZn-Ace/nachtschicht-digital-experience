
-- Fix albums: change RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Published albums viewable by everyone" ON albums;
DROP POLICY IF EXISTS "Admins can manage albums" ON albums;

CREATE POLICY "Published albums viewable by everyone" ON albums
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage albums" ON albums
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix album_photos: change RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Photos of published albums viewable by everyone" ON album_photos;
DROP POLICY IF EXISTS "Admins can manage album photos" ON album_photos;

CREATE POLICY "Photos of published albums viewable by everyone" ON album_photos
  FOR SELECT USING (EXISTS (SELECT 1 FROM albums WHERE albums.id = album_photos.album_id AND albums.is_published = true));

CREATE POLICY "Admins can manage album photos" ON album_photos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
