
-- 1. Seller/Invoice Configuration (single-row config table)
CREATE TABLE public.invoice_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT '',
  company_address text NOT NULL DEFAULT '',
  company_zip text NOT NULL DEFAULT '',
  company_city text NOT NULL DEFAULT '',
  company_country text NOT NULL DEFAULT 'Deutschland',
  tax_id text,
  vat_id text,
  bank_name text,
  bank_iban text,
  bank_bic text,
  email text,
  phone text,
  website text,
  logo_url text,
  invoice_prefix text NOT NULL DEFAULT 'INV',
  next_invoice_number integer NOT NULL DEFAULT 1,
  footer_text text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default config row
INSERT INTO public.invoice_config (company_name) VALUES ('');

-- 2. Invoices table
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE,
  ticket_id uuid REFERENCES public.tickets(id),
  event_id uuid REFERENCES public.events(id),
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_address text,
  seller_name text NOT NULL,
  seller_address text NOT NULL,
  seller_tax_id text,
  seller_vat_id text,
  subtotal numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 19,
  vat_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'draft',
  issued_at timestamp with time zone,
  paid_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_invoice_id uuid REFERENCES public.invoices(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Invoice Line Items
CREATE TABLE public.invoice_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 19,
  vat_amount numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Function to generate next invoice number atomically
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prefix text;
  _num integer;
  _year text;
  _result text;
BEGIN
  UPDATE public.invoice_config
  SET next_invoice_number = next_invoice_number + 1,
      updated_at = now()
  RETURNING invoice_prefix, next_invoice_number - 1
  INTO _prefix, _num;

  _year := to_char(now(), 'YYYY');
  _result := _prefix || '-' || _year || '-' || lpad(_num::text, 5, '0');
  RETURN _result;
END;
$$;

-- 5. Trigger to auto-update updated_at on invoices
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS policies
ALTER TABLE public.invoice_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- invoice_config: only admins
CREATE POLICY "Admins can manage invoice config"
  ON public.invoice_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read invoice config"
  ON public.invoice_config FOR SELECT
  USING (true);

-- invoices: admins full access, users can view own
CREATE POLICY "Admins can manage invoices"
  ON public.invoices FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = invoices.ticket_id AND t.user_id = auth.uid()
    )
  );

-- invoice_line_items: admins full access, users can view via invoice
CREATE POLICY "Admins can manage line items"
  ON public.invoice_line_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own line items"
  ON public.invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.tickets t ON t.id = i.ticket_id
      WHERE i.id = invoice_line_items.invoice_id AND t.user_id = auth.uid()
    )
  );
