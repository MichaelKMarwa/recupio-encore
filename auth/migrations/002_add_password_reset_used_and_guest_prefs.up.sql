-- Add used_at column to password_reset_tokens
ALTER TABLE password_reset_tokens 
ADD COLUMN used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create guest_preferences table
CREATE TABLE guest_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL REFERENCES guest_sessions(session_id) ON DELETE CASCADE,
    zip_code VARCHAR(10) NOT NULL,
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(session_id)
);

-- Create index for faster lookups
CREATE INDEX idx_guest_preferences_session_id ON guest_preferences(session_id);
