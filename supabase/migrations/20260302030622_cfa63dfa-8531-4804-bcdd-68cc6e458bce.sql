
-- Fix albums: drop RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Published albums viewable by everyone" ON public.albums;
DROP POLICY IF EXISTS "Admins can manage albums" ON public.albums;

CREATE POLICY "Published albums viewable by everyone"
  ON public.albums FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage albums"
  ON public.albums FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix album_photos: drop RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Photos of published albums viewable by everyone" ON public.album_photos;
DROP POLICY IF EXISTS "Admins can manage album photos" ON public.album_photos;

CREATE POLICY "Photos of published albums viewable by everyone"
  ON public.album_photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM albums WHERE albums.id = album_photos.album_id AND albums.is_published = true
  ));

CREATE POLICY "Admins can manage album photos"
  ON public.album_photos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix events
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Published events are viewable by everyone"
  ON public.events FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix ticket_types
DROP POLICY IF EXISTS "Anyone can view active ticket types" ON public.ticket_types;
DROP POLICY IF EXISTS "Admins can manage ticket types" ON public.ticket_types;

CREATE POLICY "Anyone can view active ticket types"
  ON public.ticket_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage ticket types"
  ON public.ticket_types FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix discount_codes
DROP POLICY IF EXISTS "Anyone can validate discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins can manage discount codes" ON public.discount_codes;

CREATE POLICY "Anyone can validate discount codes"
  ON public.discount_codes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage discount codes"
  ON public.discount_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix drinks
DROP POLICY IF EXISTS "Anyone can view active drinks" ON public.drinks;
DROP POLICY IF EXISTS "Admins can manage drinks" ON public.drinks;

CREATE POLICY "Anyone can view active drinks"
  ON public.drinks FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage drinks"
  ON public.drinks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix drink_categories
DROP POLICY IF EXISTS "Anyone can view active drink categories" ON public.drink_categories;
DROP POLICY IF EXISTS "Admins can manage drink categories" ON public.drink_categories;

CREATE POLICY "Anyone can view active drink categories"
  ON public.drink_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage drink categories"
  ON public.drink_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix event_tags
DROP POLICY IF EXISTS "Anyone can view tags" ON public.event_tags;
DROP POLICY IF EXISTS "Admins can manage tags" ON public.event_tags;

CREATE POLICY "Anyone can view tags"
  ON public.event_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tags"
  ON public.event_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix event_tag_assignments
DROP POLICY IF EXISTS "Anyone can view assignments" ON public.event_tag_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.event_tag_assignments;

CREATE POLICY "Anyone can view assignments"
  ON public.event_tag_assignments FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage assignments"
  ON public.event_tag_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix genres
DROP POLICY IF EXISTS "Anyone can view genres" ON public.genres;
DROP POLICY IF EXISTS "Admins can manage genres" ON public.genres;

CREATE POLICY "Anyone can view genres"
  ON public.genres FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage genres"
  ON public.genres FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix holiday_specials
DROP POLICY IF EXISTS "Anyone can view active holiday specials" ON public.holiday_specials;
DROP POLICY IF EXISTS "Admins can manage holiday specials" ON public.holiday_specials;

CREATE POLICY "Anyone can view active holiday specials"
  ON public.holiday_specials FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage holiday specials"
  ON public.holiday_specials FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix lounges
DROP POLICY IF EXISTS "Anyone can view lounges" ON public.lounges;
DROP POLICY IF EXISTS "Admins can manage lounges" ON public.lounges;

CREATE POLICY "Anyone can view lounges"
  ON public.lounges FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage lounges"
  ON public.lounges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix invoice_config
DROP POLICY IF EXISTS "Anyone can read invoice config" ON public.invoice_config;
DROP POLICY IF EXISTS "Admins can manage invoice config" ON public.invoice_config;

CREATE POLICY "Anyone can read invoice config"
  ON public.invoice_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage invoice config"
  ON public.invoice_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix tracking_config
DROP POLICY IF EXISTS "Anyone can read tracking config" ON public.tracking_config;
DROP POLICY IF EXISTS "Admins can manage tracking config" ON public.tracking_config;

CREATE POLICY "Anyone can read tracking config"
  ON public.tracking_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tracking config"
  ON public.tracking_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
