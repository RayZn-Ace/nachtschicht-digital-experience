
-- Fix: Make the SELECT policy on roles PERMISSIVE so authenticated users can view roles
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.roles;
CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT TO authenticated USING (true);

-- Also fix permissions and role_permissions tables (same issue)
DROP POLICY IF EXISTS "Authenticated can view permissions" ON public.permissions;
CREATE POLICY "Authenticated can view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated can view role permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
