-- Add freelancer specific fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS contact TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS completed_gigs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS role TEXT;
