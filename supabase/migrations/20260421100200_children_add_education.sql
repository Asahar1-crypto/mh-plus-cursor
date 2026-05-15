-- Add education-framework tracking to children.
-- `current_grade`: 0 = any kindergarten year, 1-12 = primary/secondary grade.
-- `education_level`: derived category used for school-calendar lookup.
-- `education_auto`: whether current_grade advances automatically on Sep 1.

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS current_grade    smallint,
  ADD COLUMN IF NOT EXISTS education_level  text,
  ADD COLUMN IF NOT EXISTS education_auto   boolean NOT NULL DEFAULT true;

ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_current_grade_range;
ALTER TABLE public.children
  ADD CONSTRAINT children_current_grade_range
  CHECK (current_grade IS NULL OR current_grade BETWEEN 0 AND 12);

ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_education_level_check;
ALTER TABLE public.children
  ADD CONSTRAINT children_education_level_check
  CHECK (
    education_level IS NULL OR
    education_level IN ('kindergarten','elementary','middle_school','high_school')
  );

COMMENT ON COLUMN public.children.current_grade IS
  'Current Israeli grade: 0=any גן, 1-6=יסודי, 7-9=חטיבת ביניים, 10-12=תיכון.';
COMMENT ON COLUMN public.children.education_level IS
  'Derived framework: kindergarten | elementary | middle_school | high_school. Kept denormalized for fast joins.';
COMMENT ON COLUMN public.children.education_auto IS
  'If true, current_grade is incremented automatically on Sep 1 each year.';

-- Deterministic mapping from grade -> level.
CREATE OR REPLACE FUNCTION public.education_level_for_grade(p_grade smallint)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_grade IS NULL      THEN NULL
    WHEN p_grade <= 0         THEN 'kindergarten'
    WHEN p_grade BETWEEN 1 AND 6  THEN 'elementary'
    WHEN p_grade BETWEEN 7 AND 9  THEN 'middle_school'
    WHEN p_grade BETWEEN 10 AND 12 THEN 'high_school'
    ELSE NULL
  END;
$$;

-- Keep education_level in sync with current_grade on insert/update.
CREATE OR REPLACE FUNCTION public.children_sync_education_level()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.education_level := public.education_level_for_grade(NEW.current_grade);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_children_sync_education_level ON public.children;
CREATE TRIGGER trg_children_sync_education_level
  BEFORE INSERT OR UPDATE OF current_grade ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.children_sync_education_level();

-- Advance all auto-managed children by one grade. Intended to run via cron
-- on Sep 1 of each year. Safe to invoke multiple times per year; the
-- `last_grade_advance_year` column on accounts tracks idempotency.
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS last_grade_advance_year smallint;

CREATE OR REPLACE FUNCTION public.advance_children_grades(p_target_year integer DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_year integer := COALESCE(p_target_year, EXTRACT(YEAR FROM now() AT TIME ZONE 'Asia/Jerusalem')::int);
  v_advanced integer := 0;
BEGIN
  -- Only advance children whose account hasn't already been advanced for v_year.
  WITH to_advance AS (
    SELECT c.id
    FROM public.children c
    JOIN public.accounts a ON a.id = c.account_id
    WHERE c.education_auto = true
      AND c.current_grade IS NOT NULL
      AND c.current_grade < 12
      AND (a.last_grade_advance_year IS NULL OR a.last_grade_advance_year < v_year)
  )
  UPDATE public.children c
  SET current_grade = LEAST(c.current_grade + 1, 12)
  WHERE c.id IN (SELECT id FROM to_advance);
  GET DIAGNOSTICS v_advanced = ROW_COUNT;

  UPDATE public.accounts
  SET last_grade_advance_year = v_year
  WHERE last_grade_advance_year IS NULL OR last_grade_advance_year < v_year;

  RETURN v_advanced;
END;
$$;

COMMENT ON FUNCTION public.advance_children_grades IS
  'Advances current_grade by 1 for all education_auto children. Intended to run via cron on Sep 1. Idempotent per year via accounts.last_grade_advance_year.';
