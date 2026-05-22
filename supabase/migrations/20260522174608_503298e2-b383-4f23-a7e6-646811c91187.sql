
-- Newsletter Listen System
CREATE TABLE IF NOT EXISTS public.newsletter_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT 'bg-primary/20 text-primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.newsletter_lists(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(list_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_nl_list_members_list ON public.newsletter_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_nl_list_members_sub ON public.newsletter_list_members(subscriber_id);

ALTER TABLE public.newsletter_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_list_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage newsletter lists"
  ON public.newsletter_lists FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage newsletter list members"
  ON public.newsletter_list_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER tr_newsletter_lists_updated
  BEFORE UPDATE ON public.newsletter_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
