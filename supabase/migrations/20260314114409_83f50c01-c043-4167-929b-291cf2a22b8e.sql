
-- Add scanner.lounges permission
INSERT INTO public.permissions (key, label, group_name)
VALUES ('scanner.lounges', 'Sieht Lounge-Buchungen', 'Scanner')
ON CONFLICT DO NOTHING;

-- Assign it to scanner role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'scanner', id FROM public.permissions WHERE key = 'scanner.lounges'
ON CONFLICT DO NOTHING;

-- Also assign scanner.stats if not already (needed for the event selector)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'scanner', id FROM public.permissions WHERE key = 'scanner.stats'
ON CONFLICT DO NOTHING;

-- RLS: Allow users with scanner role to view lounge_bookings
CREATE POLICY "Scanner can view lounge bookings"
ON public.lounge_bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('scanner', 'admin')
  )
);
