-- =====================================================
-- accounts: optional monthly_budget for the Dashboard hero bar
-- =====================================================
-- Adds an opt-in spending budget per account. NULL means no budget
-- tracking and the Dashboard hero card hides the progress bar. The
-- value is interpreted per *billing cycle*, not per calendar month —
-- HeroBalanceCard pairs it with currentAmount which is already cycle-
-- scoped via billing_cycle_start_day.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(12, 2) NULL;

COMMENT ON COLUMN public.accounts.monthly_budget IS
  'Optional spending budget per billing cycle. NULL = budget tracking disabled.';
