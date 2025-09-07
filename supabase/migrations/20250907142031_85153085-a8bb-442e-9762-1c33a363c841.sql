-- Add token column to email_change_requests table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_change_requests' 
                   AND column_name = 'token') THEN
        ALTER TABLE email_change_requests ADD COLUMN token TEXT;
    END IF;
END $$;