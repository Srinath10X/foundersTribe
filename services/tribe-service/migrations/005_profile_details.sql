-- 005: Add extended profile fields
-- All nullable — no breaking changes to existing rows

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS photo_url        TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url     TEXT,
  ADD COLUMN IF NOT EXISTS business_idea    TEXT,
  ADD COLUMN IF NOT EXISTS idea_video_url   TEXT,
  ADD COLUMN IF NOT EXISTS previous_works   JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS social_links     JSONB DEFAULT '[]';

-- previous_works shape: [{"company":"Google","role":"SWE","duration":"2020-2023"}]
-- social_links  shape:  [{"platform":"twitter","url":"https://...","label":"Twitter"}]
