
-- Fix: Make SELECT policies PERMISSIVE so public users can view drinks
DROP POLICY IF EXISTS "Anyone can view active drink categories" ON public.drink_categories;
CREATE POLICY "Anyone can view active drink categories"
ON public.drink_categories FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view active drinks" ON public.drinks;
CREATE POLICY "Anyone can view active drinks"
ON public.drinks FOR SELECT
TO anon, authenticated
USING (is_active = true);
