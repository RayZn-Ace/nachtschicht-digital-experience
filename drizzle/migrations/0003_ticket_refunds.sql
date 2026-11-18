CREATE TABLE public.ticket_payments (
  ticket_id uuid PRIMARY KEY,
  mollie_payment_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticket_payments TO authenticated;
GRANT ALL ON public.ticket_payments TO service_role;
ALTER TABLE public.ticket_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ticket payments" ON public.ticket_payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ticket_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_ids uuid[] NOT NULL,
  mollie_payment_id text NOT NULL,
  mollie_refund_id text UNIQUE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL,
  error_message text,
  requested_by uuid NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_refunds_ticket_ids_idx ON public.ticket_refunds USING gin (ticket_ids);
GRANT SELECT ON public.ticket_refunds TO authenticated;
GRANT ALL ON public.ticket_refunds TO service_role;
ALTER TABLE public.ticket_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ticket refunds" ON public.ticket_refunds FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));