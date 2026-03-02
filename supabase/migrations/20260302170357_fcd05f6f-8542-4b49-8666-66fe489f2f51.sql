
-- Newsletter categories (e.g. "Black Music", "Latin", "Techno", etc.)
CREATE TABLE public.newsletter_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT 'bg-primary/20 text-primary',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage newsletter categories"
  ON public.newsletter_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view newsletter categories"
  ON public.newsletter_categories FOR SELECT
  USING (true);

-- Junction table: subscriber <-> category (many-to-many)
CREATE TABLE public.newsletter_subscriber_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.newsletter_categories(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, category_id)
);

ALTER TABLE public.newsletter_subscriber_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage subscriber categories"
  ON public.newsletter_subscriber_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
