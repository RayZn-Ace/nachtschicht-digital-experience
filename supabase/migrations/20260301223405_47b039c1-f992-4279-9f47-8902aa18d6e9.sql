
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  date date NOT NULL,
  guest_count integer NOT NULL DEFAULT 1,
  lounge_type text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a reservation (public form)
CREATE POLICY "Anyone can submit reservation"
  ON public.reservations FOR INSERT
  WITH CHECK (true);

-- Only admins can view/manage reservations
CREATE POLICY "Admins can view reservations"
  ON public.reservations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage reservations"
  ON public.reservations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
