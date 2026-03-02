
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create account_deletions log table
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'self-service',
  reason text
);

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

-- Only admins can view deletion logs
CREATE POLICY "Admins can view deletion logs" ON public.account_deletions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Allow the edge function (service role) to insert
CREATE POLICY "Service role can insert deletion logs" ON public.account_deletions
  FOR INSERT WITH CHECK (true);
