
-- Drop the restrictive policy that limits admins to only active ticket types
DROP POLICY IF EXISTS "Anyone can view active ticket types" ON public.ticket_types;
DROP POLICY IF EXISTS "Admins can manage ticket types" ON public.ticket_types;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can manage ticket types"
ON public.ticket_types
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active ticket types"
ON public.ticket_types
FOR SELECT
TO public
USING (is_active = true);
