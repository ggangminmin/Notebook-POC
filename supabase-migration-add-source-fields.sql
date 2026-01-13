-- Supabase Migration: Add missing fields to sources table
-- Run this SQL in your Supabase SQL Editor: https://unvbpxtairtkjqygxqhy.supabase.co

-- Add file_type column (PDF, Word, Excel, TXT, etc.)
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Add file_name column (original filename from parsedData)
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Add file_size column (file size in bytes)
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0;

-- Add extracted_text column (full text content for search/analysis)
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS extracted_text TEXT;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sources'
ORDER BY ordinal_position;
