-- Fix: Make the public SELECT policies PERMISSIVE instead of RESTRICTIVE

-- lounge_bookings: allow anyone to view
DROP POLICY IF EXISTS "Anyone can check booked lounges" ON lounge_bookings;
CREATE POLICY "Anyone can check booked lounges"
  ON lounge_bookings FOR SELECT
  USING (true);

-- lounge_bookings: allow anyone to book
DROP POLICY IF EXISTS "Anyone can book a lounge" ON lounge_bookings;
CREATE POLICY "Anyone can book a lounge"
  ON lounge_bookings FOR INSERT
  WITH CHECK (true);

-- lounges: allow anyone to view
DROP POLICY IF EXISTS "Anyone can view lounges" ON lounges;
CREATE POLICY "Anyone can view lounges"
  ON lounges FOR SELECT
  USING (true);

-- events: allow published events to be viewable
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON events;
CREATE POLICY "Published events are viewable by everyone"
  ON events FOR SELECT
  USING (is_published = true);