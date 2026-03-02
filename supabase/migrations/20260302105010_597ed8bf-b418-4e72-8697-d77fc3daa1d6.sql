CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  age integer NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  positions text[] NOT NULL DEFAULT '{}',
  photo_url text,
  message text,
  status text NOT NULL DEFAULT 'neu',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage applications"
  ON public.job_applications FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can submit application"
  ON public.job_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();