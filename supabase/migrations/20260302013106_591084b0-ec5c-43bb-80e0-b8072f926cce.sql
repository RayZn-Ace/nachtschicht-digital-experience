-- Fix albums: make public SELECT policy PERMISSIVE
DROP POLICY IF EXISTS "Published albums viewable by everyone" ON albums;
CREATE POLICY "Published albums viewable by everyone"
  ON albums FOR SELECT
  USING (is_published = true);

-- Fix album_photos: make public SELECT policy PERMISSIVE
DROP POLICY IF EXISTS "Photos of published albums viewable by everyone" ON album_photos;
CREATE POLICY "Photos of published albums viewable by everyone"
  ON album_photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM albums WHERE albums.id = album_photos.album_id AND albums.is_published = true
  ));