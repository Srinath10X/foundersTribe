-- Add tribe background/cover photo support
ALTER TABLE tribes
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

