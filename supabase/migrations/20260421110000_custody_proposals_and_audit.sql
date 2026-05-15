-- Phase 5 — custody_proposals table (shared by conflict-resolution + swap
-- flows) and triggers that write to custody_audit whenever patterns or
-- exceptions change.

-- =============================================================================
-- 1. custody_proposals
-- =============================================================================
CREATE TABLE public.custody_proposals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  proposer_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('conflict_resolution','swap','historical_edit')),
  payload       jsonb NOT NULL,
  note          text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','rejected','expired','superseded')),
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '7 days',
  decided_at    timestamptz,
  decided_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custody_proposals_different_parties CHECK (proposer_id <> recipient_id)
);

CREATE INDEX idx_custody_proposals_account
  ON public.custody_proposals(account_id, status);
CREATE INDEX idx_custody_proposals_recipient_pending
  ON public.custody_proposals(recipient_id, status)
  WHERE status = 'pending';

ALTER TABLE public.custody_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members read proposals"
  ON public.custody_proposals FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Proposer inserts own proposals"
  ON public.custody_proposals FOR INSERT
  WITH CHECK (
    proposer_id = auth.uid()
    AND account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Recipient or proposer updates proposal"
  ON public.custody_proposals FOR UPDATE
  USING (
    (auth.uid() IN (proposer_id, recipient_id))
    AND account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_custody_proposals_updated_at
  BEFORE UPDATE ON public.custody_proposals
  FOR EACH ROW EXECUTE FUNCTION public.custody_set_updated_at();

-- =============================================================================
-- 2. Audit triggers on custody_exceptions
--    Every insert/update/delete writes a row into custody_audit with the diff.
--    event_date is populated from the affected row's start_date for easy
--    "show history for this day" queries.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custody_exception_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_action text;
  v_diff   jsonb;
  v_target_id uuid;
  v_account_id uuid;
  v_event_date date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_target_id := NEW.id;
    v_account_id := NEW.account_id;
    v_event_date := NEW.start_date;
    v_diff := jsonb_build_object('after', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_target_id := NEW.id;
    v_account_id := NEW.account_id;
    v_event_date := NEW.start_date;
    v_diff := jsonb_build_object(
      'before', to_jsonb(OLD),
      'after',  to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_target_id := OLD.id;
    v_account_id := OLD.account_id;
    v_event_date := OLD.start_date;
    v_diff := jsonb_build_object('before', to_jsonb(OLD));
  END IF;

  INSERT INTO public.custody_audit
    (account_id, actor_id, target, target_id, action, diff, event_date)
  VALUES
    (v_account_id, auth.uid(), 'exception', v_target_id, v_action, v_diff, v_event_date);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_custody_exception_audit ON public.custody_exceptions;
CREATE TRIGGER trg_custody_exception_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.custody_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.custody_exception_audit();

-- =============================================================================
-- 3. Audit trigger on custody_patterns (coarse — we only track insert/update
--    since patterns are upserted, never deleted, and event_date is NULL).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custody_pattern_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_action text;
  v_diff   jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_diff := jsonb_build_object('after', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_diff := jsonb_build_object(
      'before', to_jsonb(OLD),
      'after',  to_jsonb(NEW)
    );
  ELSE
    v_action := 'delete';
    v_diff := jsonb_build_object('before', to_jsonb(OLD));
  END IF;

  INSERT INTO public.custody_audit
    (account_id, actor_id, target, target_id, action, diff, event_date)
  VALUES (
    COALESCE(NEW.account_id, OLD.account_id),
    auth.uid(),
    'pattern',
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_diff,
    NULL
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_custody_pattern_audit ON public.custody_patterns;
CREATE TRIGGER trg_custody_pattern_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.custody_patterns
  FOR EACH ROW EXECUTE FUNCTION public.custody_pattern_audit();
