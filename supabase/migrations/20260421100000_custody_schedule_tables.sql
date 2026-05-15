-- Custody schedule feature: weekly recurring patterns + day-specific exceptions
-- + mutual agreement state + audit trail.
-- Replaces the per-event `custody_assignments` design with a richer model.

-- Required for the EXCLUDE constraint on daterange overlap.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================================
-- 1. custody_patterns — each parent's own weekly recurring schedule
-- =============================================================================
CREATE TABLE public.custody_patterns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  owner_user_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preset_key     text NOT NULL CHECK (preset_key IN (
    'week_on_week',
    'two_two_three',
    'sun_tue_alt_weekend',
    'mon_wed_alt_weekend',
    'weekdays_weekend',
    'alt_weekends_only',
    'three_four_four_three',
    'custom'
  )),
  label          text,                           -- optional user-friendly name
  weekday_mask_week1 smallint NOT NULL,          -- bitmask Sun=1..Sat=64 for week 1
  weekday_mask_week2 smallint,                   -- bitmask for week 2 (NULL = single-week pattern)
  dtstart        date NOT NULL,                  -- anchor date (aligns 2-week phase)
  until_date     date,                           -- optional hard end
  handoff_time   time NOT NULL DEFAULT '18:00',  -- local Asia/Jerusalem wall clock
  weekend_handoff_time time,                     -- optional different time for Fri/Sat handoffs
  acts_as        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- `acts_as` != NULL means this pattern was created on behalf of a virtual partner.
  -- When the virtual partner signs up and confirms, acts_as is cleared and
  -- owner_user_id is reassigned to their real profile id.
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custody_patterns_mask_nonzero CHECK (
    weekday_mask_week1 BETWEEN 0 AND 127
    AND (weekday_mask_week2 IS NULL OR weekday_mask_week2 BETWEEN 0 AND 127)
  ),
  CONSTRAINT custody_patterns_dates_order CHECK (until_date IS NULL OR until_date >= dtstart),
  UNIQUE (account_id, owner_user_id)
);

CREATE INDEX idx_custody_patterns_account_owner
  ON public.custody_patterns(account_id, owner_user_id);

ALTER TABLE public.custody_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members read patterns"
  ON public.custody_patterns FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Owner writes own pattern"
  ON public.custody_patterns FOR INSERT
  WITH CHECK (
    (owner_user_id = auth.uid() OR acts_as IS NOT NULL)
    AND account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner updates own pattern"
  ON public.custody_patterns FOR UPDATE
  USING (
    (owner_user_id = auth.uid() OR acts_as IS NOT NULL)
    AND account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner deletes own pattern"
  ON public.custody_patterns FOR DELETE
  USING (
    (owner_user_id = auth.uid() OR acts_as IS NOT NULL)
    AND account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- 2. custody_exceptions — day/range specific overrides (holidays, vacations,
--    swaps, one-offs). Replaces the old custody_assignments concept.
-- =============================================================================
CREATE TABLE public.custody_exceptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN (
    'holiday',
    'vacation',
    'swap',
    'one_off',
    'handoff_change'
  )),
  event_name      text,
  parent_event    text,                           -- grouping key (e.g. 'passover')
  source_event_id uuid,                           -- FK to school_calendar_events when auto-generated
  education_level text CHECK (education_level IN (
    'kindergarten','elementary','middle_school','high_school'
  )),
  claimed_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  start_time      time,                           -- NULL = full-day
  end_time        time,
  notes           text,
  created_by      uuid NOT NULL REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custody_exc_dates_order CHECK (end_date >= start_date),
  CONSTRAINT custody_exc_times_order CHECK (
    start_time IS NULL OR end_time IS NULL OR end_time >= start_time
  )
);

CREATE INDEX idx_custody_exc_account_dates
  ON public.custody_exceptions(account_id, start_date, end_date);

CREATE INDEX idx_custody_exc_source_event
  ON public.custody_exceptions(source_event_id)
  WHERE source_event_id IS NOT NULL;

ALTER TABLE public.custody_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members read exceptions"
  ON public.custody_exceptions FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Account members insert exceptions"
  ON public.custody_exceptions FOR INSERT
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Account members update exceptions"
  ON public.custody_exceptions FOR UPDATE
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Account members delete exceptions"
  ON public.custody_exceptions FOR DELETE
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- 3. custody_agreements — mutual confirmation state per account
-- =============================================================================
CREATE TABLE public.custody_agreements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  version        int  NOT NULL DEFAULT 1,
  confirmed_by   uuid[] NOT NULL DEFAULT '{}',
  last_proposal_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_proposal_at timestamptz,
  last_proposal_payload jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id)
);

ALTER TABLE public.custody_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members read agreements"
  ON public.custody_agreements FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Account members upsert agreements"
  ON public.custody_agreements FOR INSERT
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Account members update agreements"
  ON public.custody_agreements FOR UPDATE
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- 4. custody_audit — append-only trail for pattern/exception/agreement writes
-- =============================================================================
CREATE TABLE public.custody_audit (
  id         bigserial PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  actor_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target     text NOT NULL CHECK (target IN ('pattern','exception','agreement')),
  target_id  uuid NOT NULL,
  action     text NOT NULL CHECK (action IN ('insert','update','delete')),
  diff       jsonb NOT NULL,
  event_date date,                                -- the custody-calendar date the edit affects
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_custody_audit_account_time
  ON public.custody_audit(account_id, created_at DESC);

CREATE INDEX idx_custody_audit_target
  ON public.custody_audit(target, target_id);

CREATE INDEX idx_custody_audit_event_date
  ON public.custody_audit(account_id, event_date DESC)
  WHERE event_date IS NOT NULL;

ALTER TABLE public.custody_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members read audit"
  ON public.custody_audit FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

-- Inserts are controlled by the application layer (service role) or triggers;
-- no direct user INSERT policy. Updates/deletes are never allowed.

-- =============================================================================
-- 5. updated_at trigger helper (reused across custody tables)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.custody_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_custody_patterns_updated_at
  BEFORE UPDATE ON public.custody_patterns
  FOR EACH ROW EXECUTE FUNCTION public.custody_set_updated_at();

CREATE TRIGGER trg_custody_exceptions_updated_at
  BEFORE UPDATE ON public.custody_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.custody_set_updated_at();

CREATE TRIGGER trg_custody_agreements_updated_at
  BEFORE UPDATE ON public.custody_agreements
  FOR EACH ROW EXECUTE FUNCTION public.custody_set_updated_at();
