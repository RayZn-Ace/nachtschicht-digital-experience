
-- Newsletter campaigns table
CREATE TABLE public.newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  preview_text text,
  body_html text NOT NULL DEFAULT '',
  body_json jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  total_recipients integer DEFAULT 0,
  total_sent integer DEFAULT 0,
  total_failed integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage newsletters" ON public.newsletters
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Newsletter send log for tracking individual deliveries
CREATE TABLE public.newsletter_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  subscriber_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage newsletter sends" ON public.newsletter_sends
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
