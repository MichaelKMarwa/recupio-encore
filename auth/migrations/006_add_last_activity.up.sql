-- Add last_activity column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_activity'
    ) THEN
        ALTER TABLE users
        ADD COLUMN last_activity TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create index for faster queries on active users
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity); 