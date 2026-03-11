
-- Permissions table
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  group_name text NOT NULL DEFAULT 'Allgemein',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions" ON public.permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

-- Role-permissions mapping (role as text to map to app_role enum values)
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view role permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

-- Seed default permissions
INSERT INTO public.permissions (key, label, group_name) VALUES
  ('events.view', 'Events ansehen', 'Events'),
  ('events.edit', 'Events bearbeiten', 'Events'),
  ('events.delete', 'Events löschen', 'Events'),
  ('tickets.view', 'Tickets ansehen', 'Tickets'),
  ('tickets.checkin', 'Tickets einchecken', 'Tickets'),
  ('lounges.view', 'Lounges ansehen', 'Lounges'),
  ('lounges.manage', 'Lounges verwalten', 'Lounges'),
  ('newsletter.view', 'Newsletter ansehen', 'Newsletter'),
  ('newsletter.send', 'Newsletter versenden', 'Newsletter'),
  ('users.view', 'Benutzer ansehen', 'Benutzer'),
  ('users.manage', 'Benutzer verwalten', 'Benutzer'),
  ('drinks.manage', 'Getränke verwalten', 'Betrieb'),
  ('albums.manage', 'Fotoalben verwalten', 'Inhalte'),
  ('controlling.view', 'Controlling ansehen', 'Controlling'),
  ('invoices.manage', 'Rechnungen verwalten', 'Controlling'),
  ('tracking.manage', 'Tracking verwalten', 'Controlling');
