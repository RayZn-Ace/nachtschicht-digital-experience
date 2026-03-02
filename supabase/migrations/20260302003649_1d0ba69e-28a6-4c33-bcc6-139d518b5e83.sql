
-- The issue: RESTRICTIVE "Admins can manage" ALL policy blocks non-admin SELECT.
-- Fix: Drop restrictive ALL policy, create separate permissive policies for admin

DROP POLICY IF EXISTS "Admins can manage drink categories" ON public.drink_categories;
CREATE POLICY "Admins can manage drink categories"
ON public.drink_categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage drinks" ON public.drinks;
CREATE POLICY "Admins can manage drinks"
ON public.drinks FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
