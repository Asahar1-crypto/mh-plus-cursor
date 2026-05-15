-- School calendar events: authoritative source of Israeli school-year
-- holidays and vacations, per education framework.
-- Data sources: Hebcal (auto, `source='hebcal'`) for Jewish holidays;
-- admin-curated (`source='mankal' | 'manual'`) for school vacations.

CREATE TABLE public.school_calendar_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year        text NOT NULL,                 -- '2026-2027'
  event_key          text NOT NULL,                 -- 'rosh_hashanah', 'passover_break'
  name_he            text NOT NULL,
  parent_event_key   text,                          -- grouping (e.g. 'passover')
  start_date         date NOT NULL,
  end_date           date NOT NULL,
  kind               text NOT NULL CHECK (kind IN ('holiday','vacation','irregular')),
  applies_to         text[] NOT NULL,               -- subset of ['kindergarten','elementary','middle_school','high_school']
  stream             text NOT NULL DEFAULT 'mamlachti'
                      CHECK (stream IN ('mamlachti','mamlachti_dati','haredi')),
  -- stream is kept in schema for future use; v1 only populates 'mamlachti'.
  source             text NOT NULL CHECK (source IN ('hebcal','mankal','manual')),
  source_ref         text,
  verified_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_calendar_dates_order CHECK (end_date >= start_date),
  CONSTRAINT school_calendar_applies_to_nonempty CHECK (array_length(applies_to, 1) >= 1),
  UNIQUE (school_year, event_key, start_date, stream)
);

CREATE INDEX idx_school_calendar_year_dates
  ON public.school_calendar_events(school_year, start_date);

CREATE INDEX idx_school_calendar_applies_to
  ON public.school_calendar_events USING gin(applies_to);

ALTER TABLE public.school_calendar_events ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read the calendar (it's reference data).
CREATE POLICY "Authenticated users read school calendar"
  ON public.school_calendar_events FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can write. Check via profiles.is_super_admin flag
-- (existing pattern in the app; if the column is absent on a particular
-- environment the INSERT will be rejected, which is the safe default).
CREATE POLICY "Super admins insert school calendar"
  ON public.school_calendar_events FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins update school calendar"
  ON public.school_calendar_events FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins delete school calendar"
  ON public.school_calendar_events FOR DELETE
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_school_calendar_updated_at
  BEFORE UPDATE ON public.school_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.custody_set_updated_at();
