-- Fix advisor-flagged issues on the Phase 1 migrations:
-- 1. custody_assignments view must be SECURITY INVOKER so RLS on the
--    underlying custody_exceptions table is enforced against the querying user.
-- 2. All helper functions must set search_path explicitly to prevent
--    search_path-hijacking attacks.

ALTER VIEW public.custody_assignments SET (security_invoker = true);

ALTER FUNCTION public.custody_set_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.education_level_for_grade(smallint)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.children_sync_education_level()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.advance_children_grades(integer)
  SET search_path = public, pg_temp;
