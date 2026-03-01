
-- Table for U18 Clubzettel/Muttizettel submissions
CREATE TABLE public.u18_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  event_title TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE,

  -- Parent
  parent_name TEXT NOT NULL,
  parent_address TEXT NOT NULL,
  parent_country TEXT NOT NULL DEFAULT 'Deutschland',
  parent_phone TEXT NOT NULL,
  parent_birthday DATE NOT NULL,

  -- Minor
  minor_name TEXT NOT NULL,
  minor_address TEXT NOT NULL,
  minor_country TEXT NOT NULL DEFAULT 'Deutschland',
  minor_phone TEXT NOT NULL,
  minor_birthday DATE NOT NULL,

  -- Supervisor (optional)
  supervisor_name TEXT,
  supervisor_address TEXT,
  supervisor_country TEXT,
  supervisor_email TEXT,
  supervisor_phone TEXT,
  supervisor_birthday DATE,

  -- Meta
  email TEXT NOT NULL,
  has_signature BOOLEAN NOT NULL DEFAULT false,
  accept_newsletter BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.u18_forms ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a Clubzettel (public form)
CREATE POLICY "Anyone can submit u18 form"
  ON public.u18_forms
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view all submissions
CREATE POLICY "Admins can view u18 forms"
  ON public.u18_forms
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete u18 forms"
  ON public.u18_forms
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));
