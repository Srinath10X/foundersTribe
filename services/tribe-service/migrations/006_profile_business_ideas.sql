-- 006: Add multi-idea support to profiles
-- Keeps legacy business_idea for backward compatibility.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS business_ideas JSONB DEFAULT '[]';
