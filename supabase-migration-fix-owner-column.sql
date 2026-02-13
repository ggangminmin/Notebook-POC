-- Supabase Migration: Add ownerId column to notebooks table
-- Run this in the Supabase SQL Editor: https://unvbpxtairtkjqygxqhy.supabase.co

-- 1. Add ownerId column if it doesn't exist
ALTER TABLE notebooks 
ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS notebooks_ownerId_idx ON notebooks ("ownerId");

-- 3. Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notebooks';
