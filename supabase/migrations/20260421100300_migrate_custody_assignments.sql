-- Migrate existing custody_assignments rows into custody_exceptions,
-- then replace the table with a backward-compatible view so legacy
-- frontend code continues to read until it is refactored.

-- 1. Copy data into custody_exceptions.
INSERT INTO public.custody_exceptions (
  id,
  account_id,
  kind,
  event_name,
  parent_event,
  education_level,
  claimed_by,
  start_date,
  end_date,
  notes,
  created_by,
  created_at,
  updated_at
)
SELECT
  ca.id,
  ca.account_id,
  ca.event_type,                      -- 'holiday' | 'vacation' map 1:1 to kind
  ca.event_name,
  ca.parent_event,
  ca.education_level,
  ca.assigned_parent_id,
  ca.start_date,
  ca.end_date,
  ca.notes,
  ca.created_by,
  ca.created_at,
  ca.updated_at
FROM public.custody_assignments ca
ON CONFLICT (id) DO NOTHING;

-- 2. Drop old policies/constraints/indexes on the table before replacing it.
DROP POLICY IF EXISTS "Account members can view custody assignments"   ON public.custody_assignments;
DROP POLICY IF EXISTS "Account members can insert custody assignments" ON public.custody_assignments;
DROP POLICY IF EXISTS "Account members can update custody assignments" ON public.custody_assignments;
DROP POLICY IF EXISTS "Account members can delete custody assignments" ON public.custody_assignments;

-- 3. Replace the base table with a view. Any code still issuing
--    `select * from custody_assignments` keeps working in read mode.
DROP TABLE public.custody_assignments CASCADE;

CREATE VIEW public.custody_assignments AS
  SELECT
    id,
    account_id,
    event_name,
    kind          AS event_type,
    education_level,
    start_date,
    end_date,
    claimed_by    AS assigned_parent_id,
    parent_event,
    notes,
    created_by,
    created_at,
    updated_at
  FROM public.custody_exceptions
  WHERE kind IN ('holiday','vacation');

COMMENT ON VIEW public.custody_assignments IS
  'DEPRECATED read-only compatibility view over custody_exceptions. New code should query custody_exceptions directly.';
