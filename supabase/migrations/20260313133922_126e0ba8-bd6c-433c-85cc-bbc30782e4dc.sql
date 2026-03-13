
DROP POLICY IF EXISTS "Anyone can submit u18 form" ON public.u18_forms;

CREATE POLICY "Anyone can submit u18 form"
ON public.u18_forms
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
