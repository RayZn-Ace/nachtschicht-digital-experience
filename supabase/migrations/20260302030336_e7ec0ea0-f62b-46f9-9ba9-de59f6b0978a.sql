-- Fix events: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON events;
CREATE POLICY "Published events are viewable by everyone"
  ON events FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix albums
DROP POLICY IF EXISTS "Published albums viewable by everyone" ON albums;
CREATE POLICY "Published albums viewable by everyone"
  ON albums FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage albums" ON albums;
CREATE POLICY "Admins can manage albums"
  ON albums FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix album_photos
DROP POLICY IF EXISTS "Photos of published albums viewable by everyone" ON album_photos;
CREATE POLICY "Photos of published albums viewable by everyone"
  ON album_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM albums WHERE albums.id = album_photos.album_id AND albums.is_published = true));

DROP POLICY IF EXISTS "Admins can manage album photos" ON album_photos;
CREATE POLICY "Admins can manage album photos"
  ON album_photos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix ticket_types
DROP POLICY IF EXISTS "Anyone can view active ticket types" ON ticket_types;
CREATE POLICY "Anyone can view active ticket types"
  ON ticket_types FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage ticket types" ON ticket_types;
CREATE POLICY "Admins can manage ticket types"
  ON ticket_types FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix discount_codes
DROP POLICY IF EXISTS "Anyone can validate discount codes" ON discount_codes;
CREATE POLICY "Anyone can validate discount codes"
  ON discount_codes FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage discount codes" ON discount_codes;
CREATE POLICY "Admins can manage discount codes"
  ON discount_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));