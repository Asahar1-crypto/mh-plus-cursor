-- =====================================================
-- Push Notifications System
-- Device tokens, preferences, and delivery logs
-- =====================================================

-- 1. Device tokens per user per platform
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
  
  device_info JSONB DEFAULT '{}'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, token)
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;

-- 2. User notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Channel preferences
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  
  -- Per-type preferences (JSONB for flexibility)
  preferences JSONB DEFAULT '{
    "expense_pending_approval": {"push": true, "sms": false, "email": true},
    "expense_approved": {"push": true, "sms": false, "email": false},
    "expense_rejected": {"push": true, "sms": false, "email": true},
    "expense_paid": {"push": true, "sms": false, "email": false},
    "budget_threshold_75": {"push": true, "sms": false, "email": false},
    "budget_threshold_90": {"push": true, "sms": false, "email": true},
    "budget_exceeded": {"push": true, "sms": true, "email": true},
    "monthly_settlement_ready": {"push": true, "sms": false, "email": true},
    "invitation_received": {"push": true, "sms": true, "email": true},
    "recurring_expense_created": {"push": true, "sms": false, "email": false},
    "payment_due": {"push": true, "sms": false, "email": true},
    "subscription_expiring": {"push": true, "sms": false, "email": true},
    "new_family_member": {"push": true, "sms": false, "email": false},
    "account_activity": {"push": true, "sms": false, "email": false}
  }'::jsonb,
  
  -- Quiet hours (no push during these hours)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, account_id)
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

-- 3. Notification delivery log
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('push', 'sms', 'email')),
  
  -- Payload
  title TEXT,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Delivery
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'clicked')),
  platform TEXT CHECK (platform IN ('web', 'android', 'ios')),
  
  device_token_id UUID REFERENCES device_tokens(id) ON DELETE SET NULL,
  
  error_message TEXT,
  fcm_message_id TEXT,
  
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX idx_notification_logs_created ON notification_logs(created_at DESC);

-- 4. Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_tokens_updated_at();

CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_prefs_updated_at();

-- 5. Cleanup inactive tokens (utility function)
CREATE OR REPLACE FUNCTION cleanup_inactive_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM device_tokens
  WHERE is_active = false
    AND updated_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS Policies
-- =====================================================

-- device_tokens
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON device_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- notification_logs (read-only for users)
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for edge functions)
-- This is automatically handled by service_role key
