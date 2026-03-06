-- Birthday Project Module
-- Tables: birthday_projects, birthday_tasks, birthday_task_templates, birthday_triggers_log

-- ============================================================
-- 1. birthday_projects
-- ============================================================
CREATE TABLE IF NOT EXISTS public.birthday_projects (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  child_id                  UUID REFERENCES public.children(id) ON DELETE SET NULL,
  child_name                TEXT NOT NULL,
  birthday_date             DATE NOT NULL,
  child_age_at_event        INT,
  status                    TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','budget_pending','active','event_passed','settled','archived')),
  total_budget              NUMERIC(10,2),
  split_ratio_a             NUMERIC(5,2) DEFAULT 50.00,
  budget_confirmed_a        BOOLEAN NOT NULL DEFAULT FALSE,
  budget_confirmed_b        BOOLEAN NOT NULL DEFAULT FALSE,
  budget_locked_at          TIMESTAMPTZ,
  total_spent               NUMERIC(10,2) DEFAULT 0,
  transfer_amount           NUMERIC(10,2),
  transfer_payer_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  settled_at                TIMESTAMPTZ,
  initiated_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, child_id, birthday_date)
);

-- ============================================================
-- 2. birthday_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.birthday_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES public.birthday_projects(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL DEFAULT 'misc'
                     CHECK (category IN ('venue','food','entertainment','gifts','photography','invitations','decoration','misc')),
  estimated_amount NUMERIC(10,2),
  status           TEXT NOT NULL DEFAULT 'available'
                     CHECK (status IN ('available','claimed','paid','verified','cancelled')),
  claimed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at       TIMESTAMPTZ,
  paid_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at          TIMESTAMPTZ,
  actual_amount    NUMERIC(10,2),
  receipt_url      TEXT,
  verified_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  is_suggested     BOOLEAN NOT NULL DEFAULT FALSE,
  template_id      UUID,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. birthday_task_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.birthday_task_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'misc'
                  CHECK (category IN ('venue','food','entertainment','gifts','photography','invitations','decoration','misc')),
  age_min       INT NOT NULL DEFAULT 0,
  age_max       INT NOT NULL DEFAULT 99,
  is_must       BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_min NUMERIC(10,2),
  estimated_max NUMERIC(10,2),
  sort_order    INT NOT NULL DEFAULT 0,
  description   TEXT
);

-- ============================================================
-- 4. birthday_triggers_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.birthday_triggers_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  child_id      UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  birthday_year INT NOT NULL,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id    UUID REFERENCES public.birthday_projects(id) ON DELETE SET NULL,
  UNIQUE (account_id, child_id, birthday_year)
);

-- ============================================================
-- 5. updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'birthday_projects_updated_at') THEN
    CREATE TRIGGER birthday_projects_updated_at
      BEFORE UPDATE ON public.birthday_projects
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'birthday_tasks_updated_at') THEN
    CREATE TRIGGER birthday_tasks_updated_at
      BEFORE UPDATE ON public.birthday_tasks
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================================
-- 6. RLS
-- ============================================================
ALTER TABLE public.birthday_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_triggers_log ENABLE ROW LEVEL SECURITY;

-- birthday_projects policies
CREATE POLICY "birthday_projects_select" ON public.birthday_projects
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "birthday_projects_insert" ON public.birthday_projects
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "birthday_projects_update" ON public.birthday_projects
  FOR UPDATE USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

-- birthday_tasks policies
CREATE POLICY "birthday_tasks_select" ON public.birthday_tasks
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "birthday_tasks_insert" ON public.birthday_tasks
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "birthday_tasks_update" ON public.birthday_tasks
  FOR UPDATE USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "birthday_tasks_delete" ON public.birthday_tasks
  FOR DELETE USING (created_by = auth.uid());

-- birthday_task_templates: read-only for all authenticated users
CREATE POLICY "birthday_task_templates_select" ON public.birthday_task_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- birthday_triggers_log policies
CREATE POLICY "birthday_triggers_log_select" ON public.birthday_triggers_log
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "birthday_triggers_log_insert" ON public.birthday_triggers_log
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. Atomic RPC: claim_birthday_task
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_birthday_task(
  p_task_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM public.birthday_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  IF v_status <> 'available' THEN
    RAISE EXCEPTION 'TASK_NOT_AVAILABLE';
  END IF;

  UPDATE public.birthday_tasks
  SET
    status     = 'claimed',
    claimed_by = p_user_id,
    claimed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_task_id;
END;
$$;

-- ============================================================
-- 8. Cron Jobs (pg_cron)
-- ============================================================

-- 90-day trigger: create birthday_project when birthday is ~90 days away
SELECT cron.schedule(
  'birthday-90day-trigger',
  '0 7 * * *',
  $$
  INSERT INTO public.birthday_triggers_log (account_id, child_id, birthday_year, project_id)
  SELECT
    c.account_id,
    c.id AS child_id,
    EXTRACT(YEAR FROM (
      (DATE_TRUNC('year', NOW()) + (c.birthday::text::date - DATE_TRUNC('year', c.birthday::date)))::date
      + CASE WHEN (DATE_TRUNC('year', NOW()) + (c.birthday::text::date - DATE_TRUNC('year', c.birthday::date)))::date < NOW()::date
             THEN INTERVAL '1 year' ELSE INTERVAL '0' END
    ))::int AS birthday_year,
    NULL AS project_id
  FROM public.children c
  WHERE c.birthday IS NOT NULL
    AND (
      (
        DATE_TRUNC('year', NOW()) + (c.birthday::text::date - DATE_TRUNC('year', c.birthday::date))
        + CASE WHEN (DATE_TRUNC('year', NOW()) + (c.birthday::text::date - DATE_TRUNC('year', c.birthday::date)))::date < NOW()::date
               THEN INTERVAL '1 year' ELSE INTERVAL '0' END
      ) BETWEEN NOW() AND NOW() + INTERVAL '90 days'
    )
  ON CONFLICT (account_id, child_id, birthday_year) DO NOTHING;
  $$
);

-- event_passed transition: mark projects as event_passed 7 days after birthday
SELECT cron.schedule(
  'birthday-event-passed',
  '0 8 * * *',
  $$
  UPDATE public.birthday_projects
  SET status = 'event_passed', updated_at = NOW()
  WHERE status = 'active'
    AND birthday_date < NOW()::date - INTERVAL '7 days';
  $$
);

-- archive settled projects: 30 days after settled_at
SELECT cron.schedule(
  'birthday-archive-settled',
  '0 3 * * *',
  $$
  UPDATE public.birthday_projects
  SET status = 'archived', updated_at = NOW()
  WHERE status = 'settled'
    AND settled_at < NOW() - INTERVAL '30 days';
  $$
);

-- ============================================================
-- 9. Seed: birthday_task_templates
-- ============================================================
INSERT INTO public.birthday_task_templates (title, category, age_min, age_max, is_must, estimated_min, estimated_max, sort_order, description) VALUES
-- Ages 0–7
('מקום לאירוע', 'venue', 0, 7, true, 500, 2000, 1, 'השכרת מקום למסיבה - חצר, אולם קטן, או מרכז קהילתי'),
('עוגת יום הולדת', 'food', 0, 7, true, 150, 400, 2, 'הזמנת עוגה מעוצבת מאפייה או הכנה ביתית'),
('הזמנות', 'invitations', 0, 7, false, 30, 100, 3, 'הדפסת הזמנות פיזיות או שליחה דיגיטלית'),
('קישוטים ובלונים', 'decoration', 0, 7, true, 100, 300, 4, 'בלונים, שרשראות נייר, עיצוב שולחן'),
('מתנה מיוחדת מההורים', 'gifts', 0, 7, true, 200, 600, 5, 'מתנה גדולה מרכזית להפתיע את הילד/ה'),
('מתנות לאורחים (מנות)', 'gifts', 0, 7, false, 80, 200, 6, 'שקיות מתנה קטנות לילדים שמגיעים'),
('הגשת אוכל/חטיפים', 'food', 0, 7, true, 100, 350, 7, 'חטיפים, שתייה, ממתקים לשולחן'),
('קוסם / ליצן', 'entertainment', 0, 7, false, 400, 900, 8, 'הופעת קוסם או ליצן לילדים'),

-- Ages 8–11
('מקום לאירוע - גן אירועים', 'venue', 8, 11, true, 800, 2500, 10, 'אולם, גן שעשועים, פארק'),
('עוגת יום הולדת', 'food', 8, 11, true, 150, 500, 11, 'עוגה מעוצבת לפי תחביב הילד/ה'),
('אוכל וקייטרינג', 'food', 8, 11, true, 200, 700, 12, 'פיצות, שניצלים, ארגזי אוכל'),
('קישוטים בנושא', 'decoration', 8, 11, false, 150, 400, 13, 'קישוטים ממוקדי נושא (ספידרמן, יוניקורן וכו'')'),
('הזמנות', 'invitations', 8, 11, false, 50, 150, 14, 'הזמנות מעוצבות'),
('מתנה מרכזית', 'gifts', 8, 11, true, 300, 800, 15, 'מתנה מיוחדת – משחק, אביזר ספורט, טאבלט'),
('צלם לאירוע', 'photography', 8, 11, false, 400, 1000, 16, 'צילום תמונות ו/או וידיאו'),
('פעילות גיבוש', 'entertainment', 8, 11, false, 300, 800, 17, 'בריחה לחדר, בולינג, לייזר טאג'),

-- Ages 12+
('מקום מיוחד', 'venue', 12, 99, true, 1000, 4000, 20, 'מסעדה, בית קפה, או שכירת מקום ייחודי'),
('קייטרינג / מסעדה', 'food', 12, 99, true, 500, 2000, 21, 'ארוחה מסודרת לקבוצה'),
('מתנה איכותית', 'gifts', 12, 99, true, 500, 1500, 22, 'מתנה משמעותית – אוזניות, מצלמה, שעון'),
('צלם/ת מקצועי', 'photography', 12, 99, false, 600, 1500, 23, 'תיעוד מקצועי של האירוע'),
('קישוטים ואווירה', 'decoration', 12, 99, false, 200, 600, 24, 'בלונים, שלטים, תפאורה'),
('הפתעה מיוחדת', 'entertainment', 12, 99, false, 500, 1500, 25, 'הופעה, פעילות חוץ, חוויה');
