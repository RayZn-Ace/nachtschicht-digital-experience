-- Allow users to view invoices where buyer_email matches their auth email
CREATE POLICY "Users can view invoices by email"
  ON public.invoices
  FOR SELECT
  USING (buyer_email = auth.jwt()->>'email');

-- Same for line items
CREATE POLICY "Users can view line items by email"
  ON public.invoice_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND i.buyer_email = auth.jwt()->>'email'
    )
  );