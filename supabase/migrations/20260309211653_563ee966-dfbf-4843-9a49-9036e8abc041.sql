
CREATE TABLE public.event_lounges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  lounge_id uuid NOT NULL REFERENCES public.lounges(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, lounge_id)
);

ALTER TABLE public.event_lounges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage event lounges" ON public.event_lounges
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view event lounges" ON public.event_lounges
  FOR SELECT TO public
  USING (true);
