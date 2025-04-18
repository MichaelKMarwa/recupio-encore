-- Add last_login column to track user login activity
ALTER TABLE users
ADD COLUMN last_login TIMESTAMP WITH TIME ZONE; 