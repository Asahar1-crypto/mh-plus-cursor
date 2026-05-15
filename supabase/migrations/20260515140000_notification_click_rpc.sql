-- =====================================================
-- mark_notification_clicked RPC
-- =====================================================
-- Lets the authenticated client mark a notification_logs row as clicked
-- without needing direct UPDATE rights. The notificationId travels in
-- the FCM payload's `data.notificationId` (== idempotency_key); the SW
-- forwards it to the client on tap, which calls this RPC. Scope is
-- locked to the caller's own user_id, so an attacker who guesses an
-- idempotency_key can't poison another user's click stats.

CREATE OR REPLACE FUNCTION public.mark_notification_clicked(p_notification_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notification_logs
  SET status = 'clicked', clicked_at = NOW()
  WHERE data->>'idempotency_key' = p_notification_id
    AND user_id = auth.uid()
    AND status <> 'clicked';
$$;

REVOKE ALL ON FUNCTION public.mark_notification_clicked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_clicked(text) TO authenticated;
