-- Generic system errors log. Edge functions write here (via service_role)
-- whenever an upstream call (OpenAI, Vonage, etc.) or internal step fails in
-- a way the end user shouldn't see in raw form. Super admins can review,
-- annotate, and mark as resolved.

CREATE TABLE public.system_errors (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  function_name     text NOT NULL,                          -- e.g. 'scan-receipt'
  error_category    text NOT NULL,
  error_code        text,                                   -- upstream code, e.g. 'insufficient_quota'
  user_message      text NOT NULL,                          -- friendly Hebrew msg returned to user
  raw_details       jsonb NOT NULL DEFAULT '{}'::jsonb,     -- full upstream error body (PII-redacted)
  user_id           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  account_id        uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  request_metadata  jsonb,                                  -- safe context: file_size, file_type, status
  http_status       int,                                    -- response status returned to client
  resolved_at       timestamptz,
  resolved_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note   text,
  CONSTRAINT system_errors_category_check CHECK (
    error_category IN (
      'openai_quota','openai_rate_limit','openai_auth','openai_model','openai_other',
      'image_unreadable','validation','auth_failed','authz_failed',
      'db_error','config_missing','unknown'
    )
  )
);

CREATE INDEX idx_system_errors_created_at ON public.system_errors(created_at DESC);
CREATE INDEX idx_system_errors_function   ON public.system_errors(function_name, created_at DESC);
CREATE INDEX idx_system_errors_category   ON public.system_errors(error_category, created_at DESC);
CREATE INDEX idx_system_errors_unresolved ON public.system_errors(created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_system_errors_account    ON public.system_errors(account_id) WHERE account_id IS NOT NULL;

ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

-- Inserts come from edge functions running with service_role, which bypasses
-- RLS — no INSERT policy needed (and we don't want users inserting).

CREATE POLICY "Super admins can view all system errors"
  ON public.system_errors FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update resolution fields"
  ON public.system_errors FOR UPDATE
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete system errors"
  ON public.system_errors FOR DELETE
  USING (public.is_super_admin(auth.uid()));

COMMENT ON TABLE public.system_errors IS 'Operational error log visible to super admins. Written by edge functions via service_role.';
COMMENT ON COLUMN public.system_errors.error_category IS 'Coarse classification: openai_quota / openai_rate_limit / openai_auth / openai_model / openai_other / image_unreadable / validation / auth_failed / authz_failed / db_error / config_missing / unknown';
COMMENT ON COLUMN public.system_errors.raw_details IS 'Full upstream error body. Sensitive tokens (e.g. signed URL tokens) MUST be redacted by the caller before insert.';
