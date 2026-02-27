-- Create settlement_payments table for tracking actual money transfers
CREATE TABLE IF NOT EXISTS public.settlement_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id),
  to_user_id uuid NOT NULL REFERENCES public.profiles(id),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('bank_transfer', 'bit', 'paybox', 'cash', 'other')),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.settlement_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view settlement payments"
  ON public.settlement_payments FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Account members can insert settlement payments"
  ON public.settlement_payments FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can delete own settlement payments"
  ON public.settlement_payments FOR DELETE
  USING (created_by = auth.uid());

CREATE INDEX idx_settlement_payments_account ON public.settlement_payments(account_id);
CREATE INDEX idx_settlement_payments_date ON public.settlement_payments(payment_date DESC);
