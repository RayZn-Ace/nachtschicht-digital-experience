-- Tickets: no more public read of all tickets; guests read their just-purchased tickets via RPC by unguessable IDs
DROP POLICY IF EXISTS "Anyone can view ticket by qr_code" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can buy tickets" ON public.tickets;
CREATE POLICY "Admins can insert tickets" ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_purchased_tickets(p_ids uuid[])
RETURNS TABLE(id uuid, status text, qr_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.status, CASE WHEN t.status = 'confirmed' THEN t.qr_code END
  FROM public.tickets t
  WHERE t.id = ANY(p_ids[1:50])
$$;
REVOKE ALL ON FUNCTION public.get_purchased_tickets(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_purchased_tickets(uuid[]) TO anon, authenticated;

-- Discount codes are validated server-side only; no public listing
DROP POLICY IF EXISTS "Anyone can validate discount codes" ON public.discount_codes;

-- Lounge bookings: public may only create unpaid non-binding requests for themselves
DROP POLICY IF EXISTS "Anyone can book a lounge" ON public.lounge_bookings;
CREATE POLICY "Public can request non-binding lounge" ON public.lounge_bookings FOR INSERT TO anon, authenticated
  WITH CHECK (
    booking_type = 'non_binding' AND status = 'pending' AND deposit_paid = false AND deposit_amount = 0
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Role metadata: only own roles (or admins)
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.roles;
CREATE POLICY "Users can view own roles meta" ON public.roles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = roles.name));
DROP POLICY IF EXISTS "Authenticated can view role permissions" ON public.role_permissions;
CREATE POLICY "Users can view own role permissions" ON public.role_permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = role_permissions.role));
DROP POLICY IF EXISTS "Authenticated can view permissions" ON public.permissions;
CREATE POLICY "Staff can view permissions" ON public.permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- Deletion log is written by the backend (service role) only
DROP POLICY IF EXISTS "Service role can insert deletion logs" ON public.account_deletions;