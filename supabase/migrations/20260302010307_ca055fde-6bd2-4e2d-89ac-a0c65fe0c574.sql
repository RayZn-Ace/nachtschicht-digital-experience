
CREATE TABLE public.holiday_specials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  date_label text NOT NULL DEFAULT '',
  hours text NOT NULL DEFAULT '',
  note_de text,
  note_en text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.holiday_specials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage holiday specials"
  ON public.holiday_specials FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active holiday specials"
  ON public.holiday_specials FOR SELECT
  USING (is_active = true);
