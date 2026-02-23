-- 010: Add address field to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS address TEXT;

