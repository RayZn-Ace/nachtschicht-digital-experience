
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can check booked lounges" ON public.lounge_bookings;

-- Allow authenticated users to view only their own bookings
CREATE POLICY "Users can view own bookings"
ON public.lounge_bookings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
