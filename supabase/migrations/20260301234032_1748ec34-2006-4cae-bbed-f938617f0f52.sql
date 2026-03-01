
-- Ticket types per event (Early Bird, VIP, Standard, etc.)
CREATE TABLE public.ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 100,
  sold integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sale_start timestamptz,
  sale_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ticket types"
ON public.ticket_types FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active ticket types"
ON public.ticket_types FOR SELECT
USING (is_active = true);

-- Discount codes
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage discount codes"
ON public.discount_codes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can validate discount codes"
ON public.discount_codes FOR SELECT
USING (is_active = true);

-- Add ticket_type_id and discount_code_id to tickets, also add qr_code
ALTER TABLE public.tickets 
  ADD COLUMN ticket_type_id uuid REFERENCES public.ticket_types(id),
  ADD COLUMN discount_code_id uuid REFERENCES public.discount_codes(id),
  ADD COLUMN qr_code text UNIQUE,
  ADD COLUMN checked_in boolean NOT NULL DEFAULT false,
  ADD COLUMN checked_in_at timestamptz;

-- Make user_id nullable for guest purchases
ALTER TABLE public.tickets ALTER COLUMN user_id DROP NOT NULL;

-- Update the insert policy to allow anyone to buy tickets
DROP POLICY IF EXISTS "Authenticated users can buy tickets" ON public.tickets;
CREATE POLICY "Anyone can buy tickets"
ON public.tickets FOR INSERT
WITH CHECK (true);

-- Allow viewing tickets by qr_code (for scanner)
CREATE POLICY "Anyone can view ticket by qr_code"
ON public.tickets FOR SELECT
USING (qr_code IS NOT NULL);

-- Allow updating checked_in status (for scanner)
CREATE POLICY "Admins can update tickets"
ON public.tickets FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
