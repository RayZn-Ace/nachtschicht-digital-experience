
-- Lounges table (static definitions)
CREATE TABLE public.lounges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  area_id TEXT NOT NULL DEFAULT 'lavie',
  capacity INTEGER NOT NULL DEFAULT 10,
  min_spend NUMERIC NOT NULL DEFAULT 200,
  price_per_person NUMERIC NOT NULL DEFAULT 20,
  image_url TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lounge bookings linked to events
CREATE TABLE public.lounge_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lounge_id UUID NOT NULL REFERENCES public.lounges(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT,
  guest_count INTEGER NOT NULL DEFAULT 1,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Each lounge can only be booked once per event
  UNIQUE(lounge_id, event_id)
);

-- RLS
ALTER TABLE public.lounges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_bookings ENABLE ROW LEVEL SECURITY;

-- Lounges: everyone can read, admins can manage
CREATE POLICY "Anyone can view lounges" ON public.lounges FOR SELECT USING (true);
CREATE POLICY "Admins can manage lounges" ON public.lounges FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Lounge bookings: anyone can insert (booking request), admins can manage all
CREATE POLICY "Anyone can book a lounge" ON public.lounge_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage lounge bookings" ON public.lounge_bookings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can check booked lounges" ON public.lounge_bookings FOR SELECT USING (true);
