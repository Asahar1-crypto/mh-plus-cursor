-- Create account_activity_logs table for user-facing audit trail
CREATE TABLE IF NOT EXISTS public.account_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  user_name text NOT NULL,
  action text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.account_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view activity logs"
  ON public.account_activity_logs FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Account members can insert activity logs"
  ON public.account_activity_logs FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_activity_logs_account ON public.account_activity_logs(account_id);
CREATE INDEX idx_activity_logs_created ON public.account_activity_logs(created_at DESC);
