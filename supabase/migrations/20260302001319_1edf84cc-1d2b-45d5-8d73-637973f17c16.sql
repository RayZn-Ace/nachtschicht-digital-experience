
-- Add new fields to lounge_bookings for enhanced reservation system
ALTER TABLE public.lounge_bookings 
  ADD COLUMN IF NOT EXISTS arrival_time text,
  ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'non_binding',
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS agreed_terms boolean NOT NULL DEFAULT false;

-- Update status options comment
COMMENT ON COLUMN public.lounge_bookings.booking_type IS 'guaranteed or non_binding';
COMMENT ON COLUMN public.lounge_bookings.status IS 'pending, confirmed, rejected, cancelled, replaced';
