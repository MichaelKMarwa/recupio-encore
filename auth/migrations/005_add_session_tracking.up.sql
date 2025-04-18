-- Add last_accessed_at column to track session activity if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'guest_sessions' 
        AND column_name = 'last_accessed_at'
    ) THEN
        ALTER TABLE guest_sessions
        ADD COLUMN last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON guest_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_last_accessed_at ON guest_sessions(last_accessed_at);

-- Add additional constraints to password_reset_tokens if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'password_reset_tokens_user_id_fkey'
    ) THEN
        ALTER TABLE password_reset_tokens
        ADD CONSTRAINT password_reset_tokens_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$; 