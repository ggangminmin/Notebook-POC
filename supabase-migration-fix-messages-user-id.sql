-- Supabase Migration: Add user_id column to messages table
-- Run this in the Supabase SQL Editor: https://unvbpxtairtkjqygxqhy.supabase.co

-- 1. Add user_id column if it doesn't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "user_id" TEXT;

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages ("user_id");

-- 3. Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages';
