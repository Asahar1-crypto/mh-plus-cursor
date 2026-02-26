-- Create custody_assignments table for holiday/vacation custody management
CREATE TABLE IF NOT EXISTS public.custody_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('holiday', 'vacation')),
  education_level text CHECK (education_level IN ('kindergarten', 'elementary', 'middle_school', 'high_school')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  assigned_parent_id uuid REFERENCES public.profiles(id),
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (account_id, event_name, start_date)
);

ALTER TABLE public.custody_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view custody assignments"
  ON public.custody_assignments
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Account members can insert custody assignments"
  ON public.custody_assignments
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Account members can update custody assignments"
  ON public.custody_assignments
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Account members can delete custody assignments"
  ON public.custody_assignments
  FOR DELETE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_custody_assignments_account ON public.custody_assignments(account_id);
CREATE INDEX idx_custody_assignments_dates ON public.custody_assignments(start_date, end_date);
