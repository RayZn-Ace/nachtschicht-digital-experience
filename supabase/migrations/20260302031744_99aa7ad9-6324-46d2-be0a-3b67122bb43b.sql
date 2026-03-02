
-- Fix all RESTRICTIVE public SELECT policies to PERMISSIVE
-- Drop and recreate the public-facing SELECT policies

-- lounges
DROP POLICY IF EXISTS "Anyone can view lounges" ON public.lounges;
CREATE POLICY "Anyone can view lounges" ON public.lounges FOR SELECT USING (true);

-- events
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
CREATE POLICY "Published events are viewable by everyone" ON public.events FOR SELECT USING (is_published = true);

-- lounge_bookings
DROP POLICY IF EXISTS "Anyone can check booked lounges" ON public.lounge_bookings;
CREATE POLICY "Anyone can check booked lounges" ON public.lounge_bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can book a lounge" ON public.lounge_bookings;
CREATE POLICY "Anyone can book a lounge" ON public.lounge_bookings FOR INSERT WITH CHECK (true);

-- albums
DROP POLICY IF EXISTS "Published albums viewable by everyone" ON public.albums;
CREATE POLICY "Published albums viewable by everyone" ON public.albums FOR SELECT USING (is_published = true);

-- album_photos
DROP POLICY IF EXISTS "Photos of published albums viewable by everyone" ON public.album_photos;
CREATE POLICY "Photos of published albums viewable by everyone" ON public.album_photos FOR SELECT USING (EXISTS (SELECT 1 FROM albums WHERE albums.id = album_photos.album_id AND albums.is_published = true));

-- drink_categories
DROP POLICY IF EXISTS "Anyone can view active drink categories" ON public.drink_categories;
CREATE POLICY "Anyone can view active drink categories" ON public.drink_categories FOR SELECT USING (is_active = true);

-- drinks
DROP POLICY IF EXISTS "Anyone can view active drinks" ON public.drinks;
CREATE POLICY "Anyone can view active drinks" ON public.drinks FOR SELECT USING (is_active = true);

-- event_tags
DROP POLICY IF EXISTS "Anyone can view tags" ON public.event_tags;
CREATE POLICY "Anyone can view tags" ON public.event_tags FOR SELECT USING (true);

-- event_tag_assignments
DROP POLICY IF EXISTS "Anyone can view assignments" ON public.event_tag_assignments;
CREATE POLICY "Anyone can view assignments" ON public.event_tag_assignments FOR SELECT USING (true);

-- ticket_types
DROP POLICY IF EXISTS "Anyone can view active ticket types" ON public.ticket_types;
CREATE POLICY "Anyone can view active ticket types" ON public.ticket_types FOR SELECT USING (is_active = true);

-- discount_codes
DROP POLICY IF EXISTS "Anyone can validate discount codes" ON public.discount_codes;
CREATE POLICY "Anyone can validate discount codes" ON public.discount_codes FOR SELECT USING (is_active = true);

-- genres
DROP POLICY IF EXISTS "Anyone can view genres" ON public.genres;
CREATE POLICY "Anyone can view genres" ON public.genres FOR SELECT USING (true);

-- holiday_specials
DROP POLICY IF EXISTS "Anyone can view active holiday specials" ON public.holiday_specials;
CREATE POLICY "Anyone can view active holiday specials" ON public.holiday_specials FOR SELECT USING (is_active = true);

-- tracking_config
DROP POLICY IF EXISTS "Anyone can read tracking config" ON public.tracking_config;
CREATE POLICY "Anyone can read tracking config" ON public.tracking_config FOR SELECT USING (true);

-- invoice_config
DROP POLICY IF EXISTS "Anyone can read invoice config" ON public.invoice_config;
CREATE POLICY "Anyone can read invoice config" ON public.invoice_config FOR SELECT USING (true);

-- newsletter_subscribers (INSERT)
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);

-- reservations (INSERT)
DROP POLICY IF EXISTS "Anyone can submit reservation" ON public.reservations;
CREATE POLICY "Anyone can submit reservation" ON public.reservations FOR INSERT WITH CHECK (true);

-- tickets (INSERT + public SELECT)
DROP POLICY IF EXISTS "Anyone can buy tickets" ON public.tickets;
CREATE POLICY "Anyone can buy tickets" ON public.tickets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view ticket by qr_code" ON public.tickets;
CREATE POLICY "Anyone can view ticket by qr_code" ON public.tickets FOR SELECT USING (qr_code IS NOT NULL);

-- u18_forms (INSERT)
DROP POLICY IF EXISTS "Anyone can submit u18 form" ON public.u18_forms;
CREATE POLICY "Anyone can submit u18 form" ON public.u18_forms FOR INSERT WITH CHECK (true);

-- tracking_events (INSERT)
DROP POLICY IF EXISTS "Anyone can insert tracking events" ON public.tracking_events;
CREATE POLICY "Anyone can insert tracking events" ON public.tracking_events FOR INSERT WITH CHECK (true);
