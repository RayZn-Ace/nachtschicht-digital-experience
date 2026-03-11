
-- 1. Create roles table
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text NOT NULL DEFAULT 'bg-primary/20 text-primary',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- RLS: admins manage, anyone authenticated can view
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT TO authenticated USING (true);

-- 2. Seed system roles
INSERT INTO public.roles (name, is_system, description, color) VALUES
  ('admin', true, 'Vollzugriff auf alle Bereiche', 'bg-primary/20 text-primary'),
  ('user', true, 'Standard-Benutzerrolle', 'bg-accent/20 text-accent-foreground');
