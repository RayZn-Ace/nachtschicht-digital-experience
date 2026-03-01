
-- Tags table
CREATE TABLE public.event_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT 'bg-primary/20 text-primary',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tags"
ON public.event_tags FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view tags"
ON public.event_tags FOR SELECT
USING (true);

-- Junction table: event <-> tag
CREATE TABLE public.event_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.event_tags(id) ON DELETE CASCADE,
  UNIQUE(event_id, tag_id)
);

ALTER TABLE public.event_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assignments"
ON public.event_tag_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view assignments"
ON public.event_tag_assignments FOR SELECT
USING (true);
