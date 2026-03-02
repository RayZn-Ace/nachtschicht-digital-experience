
-- Add fee configuration to events (event-level defaults)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS fee_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_type text NOT NULL DEFAULT 'per_ticket',
  ADD COLUMN IF NOT EXISTS fee_mode text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS fee_amount numeric NOT NULL DEFAULT 0;

-- Add fee override to ticket_types (per-type override)
ALTER TABLE public.ticket_types
  ADD COLUMN IF NOT EXISTS fee_override_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_mode_override text,
  ADD COLUMN IF NOT EXISTS fee_amount_override numeric;

-- Store actual fee charged on each ticket for historical accuracy
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS fee_amount numeric NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.events.fee_type IS 'per_ticket or per_order';
COMMENT ON COLUMN public.events.fee_mode IS 'fixed or percent';
COMMENT ON COLUMN public.events.fee_amount IS 'Fee amount in EUR (fixed) or percentage';
