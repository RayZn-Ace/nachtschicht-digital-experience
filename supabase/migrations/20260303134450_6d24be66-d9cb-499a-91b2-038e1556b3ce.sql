
-- Create a security definer function that returns only non-sensitive booking data
CREATE OR REPLACE FUNCTION public.get_lounge_availability(p_event_id uuid DEFAULT NULL)
RETURNS TABLE(lounge_id uuid, event_id uuid, booking_type text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lb.lounge_id, lb.event_id, lb.booking_type, lb.status
  FROM public.lounge_bookings lb
  WHERE lb.status NOT IN ('cancelled', 'rejected')
    AND (p_event_id IS NULL OR lb.event_id = p_event_id)
$$;
