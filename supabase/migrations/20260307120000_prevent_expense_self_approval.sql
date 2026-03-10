-- Security fix: prevent self-approval of expenses at the database level.
-- The frontend guard in useExpenseActions.ts can be bypassed via direct API calls.
-- This trigger enforces the rule unconditionally for all clients.

CREATE OR REPLACE FUNCTION public.check_expense_self_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_slug TEXT;
BEGIN
  -- Only enforce when status is transitioning TO 'approved'
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN

    -- Personal-plan accounts are single-user; self-approval is intentional there
    SELECT plan_slug INTO v_plan_slug
    FROM public.accounts
    WHERE id = NEW.account_id;

    IF v_plan_slug IS DISTINCT FROM 'personal' THEN
      -- approved_by is set to auth.uid() by the service before the UPDATE reaches the DB
      IF NEW.approved_by IS NOT NULL AND NEW.approved_by = NEW.created_by_id THEN
        RAISE EXCEPTION 'self_approval_not_allowed'
          USING DETAIL = 'A user cannot approve an expense they created.',
                HINT   = 'Have the other account member approve this expense.';
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Drop if an old version exists, then create
DROP TRIGGER IF EXISTS trg_prevent_expense_self_approval ON public.expenses;

CREATE TRIGGER trg_prevent_expense_self_approval
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.check_expense_self_approval();
