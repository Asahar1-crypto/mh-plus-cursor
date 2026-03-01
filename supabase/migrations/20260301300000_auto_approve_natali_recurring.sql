-- ================================================================
-- One-time: mark Natali's recurring templates as auto-approved by Ariel
-- (2026-03-01)
--
-- Background: Ariel approved Natali's recurring expense instances via
-- the regular "approve once" button, which did not set the
-- recurring_auto_approved flag on the templates. Every month the
-- system generated new instances with status='pending'.
--
-- This migration finds:
--   • the profile named נטלי (creator of the templates)
--   • the profile named אריאל (the approver)
-- and sets recurring_auto_approved=TRUE, recurring_approved_by=ariel_id
-- on all active monthly templates created by Natali.
-- ================================================================

DO $$
DECLARE
  v_natali_id  UUID;
  v_ariel_id   UUID;
  v_count      INTEGER;
BEGIN
  -- Find Natali's profile ID (case-insensitive, partial match)
  SELECT id INTO v_natali_id
  FROM public.profiles
  WHERE name ILIKE '%נטלי%' OR name ILIKE '%natali%' OR name ILIKE '%nataly%'
  LIMIT 1;

  IF v_natali_id IS NULL THEN
    RAISE EXCEPTION 'Could not find a profile matching נטלי – check profiles table';
  END IF;
  RAISE NOTICE 'Found Natali: id=%', v_natali_id;

  -- Find Ariel's profile ID
  SELECT id INTO v_ariel_id
  FROM public.profiles
  WHERE name ILIKE '%אריאל%' OR name ILIKE '%ariel%'
  LIMIT 1;

  IF v_ariel_id IS NULL THEN
    RAISE EXCEPTION 'Could not find a profile matching אריאל – check profiles table';
  END IF;
  RAISE NOTICE 'Found Ariel: id=%', v_ariel_id;

  -- Preview: show which templates will be updated
  RAISE NOTICE '--- Templates to be updated ---';
  FOR v_count IN
    SELECT 1 FROM public.expenses
    WHERE created_by_id     = v_natali_id
      AND is_recurring      = TRUE
      AND recurring_parent_id IS NULL
      AND frequency         = 'monthly'
      AND (recurring_active IS NULL OR recurring_active = TRUE)
  LOOP
    -- just counting, real log below
  END LOOP;

  SELECT COUNT(*) INTO v_count
  FROM public.expenses
  WHERE created_by_id       = v_natali_id
    AND is_recurring        = TRUE
    AND recurring_parent_id IS NULL
    AND frequency           = 'monthly'
    AND (recurring_active IS NULL OR recurring_active = TRUE);

  RAISE NOTICE 'Templates found for update: %', v_count;

  -- Log each template description
  FOR v_count IN
    SELECT 1
  LOOP END LOOP;

  -- Actual update
  UPDATE public.expenses
  SET
    recurring_auto_approved = TRUE,
    recurring_approved_by   = v_ariel_id
  WHERE created_by_id       = v_natali_id
    AND is_recurring        = TRUE
    AND recurring_parent_id IS NULL
    AND frequency           = 'monthly'
    AND (recurring_active IS NULL OR recurring_active = TRUE);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated % template(s) → recurring_auto_approved=TRUE, recurring_approved_by=%',
    v_count, v_ariel_id;
END;
$$;
