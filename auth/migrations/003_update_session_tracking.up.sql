-- Add last_accessed_at column to track session activity
ALTER TABLE guest_sessions
ADD COLUMN last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX idx_guest_sessions_expires_at ON guest_sessions(expires_at);
CREATE INDEX idx_guest_sessions_last_accessed_at ON guest_sessions(last_accessed_at);

-- Add additional constraints to password_reset_tokens
ALTER TABLE password_reset_tokens
ADD CONSTRAINT password_reset_tokens_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE; 