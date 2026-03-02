
-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can buy tickets" ON public.tickets;

-- Recreate as PERMISSIVE so no auth is required
CREATE POLICY "Anyone can buy tickets"
ON public.tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
