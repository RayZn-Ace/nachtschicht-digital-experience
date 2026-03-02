
-- Lost & Found submissions
CREATE TABLE public.lost_and_found (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date date NOT NULL,
  category text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lost_and_found ENABLE ROW LEVEL SECURITY;

-- Anyone can submit
CREATE POLICY "Anyone can submit lost and found"
ON public.lost_and_found
FOR INSERT
WITH CHECK (true);

-- Admins can manage
CREATE POLICY "Admins can manage lost and found"
ON public.lost_and_found
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_lost_and_found_updated_at
BEFORE UPDATE ON public.lost_and_found
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
