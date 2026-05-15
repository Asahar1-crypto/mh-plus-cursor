-- =====================================================
-- device_tokens: composite partial index for push lookups
-- =====================================================
-- send-push-notification runs `SELECT * FROM device_tokens
-- WHERE user_id = $1 AND is_active = true` on every push send.
-- The existing indexes (user_id) and (is_active WHERE is_active = true)
-- cannot be combined efficiently for this composite predicate, forcing
-- a heap scan as the table grows. A partial index on user_id where
-- is_active is true is the smallest possible index that fully covers
-- the query and stays tiny because inactive tokens are excluded.

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active
  ON device_tokens(user_id)
  WHERE is_active = true;
