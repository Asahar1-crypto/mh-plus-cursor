-- Add missing columns to email_change_requests table if they don't exist
DO $$ 
BEGIN
    -- Add token column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='email_change_requests' AND column_name='token') THEN
        ALTER TABLE email_change_requests ADD COLUMN token UUID;
    END IF;
    
    -- Add expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='email_change_requests' AND column_name='expires_at') THEN
        ALTER TABLE email_change_requests ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add confirmed_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='email_change_requests' AND column_name='confirmed_at') THEN
        ALTER TABLE email_change_requests ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create unique index on token column for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_change_requests_token ON email_change_requests(token);