-- 008: Add user_type field
-- Values: 'founder', 'freelancer' (nullable for existing users)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_type TEXT;

-- Optional: Add check constraint to ensure only valid types
-- ALTER TABLE profiles ADD CONSTRAINT check_user_type CHECK (user_type IN ('founder', 'freelancer'));
