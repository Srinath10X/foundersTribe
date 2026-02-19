-- 007: Tracks whether minimum profile onboarding details are completed.
-- Minimum currently means:
-- - non-empty display_name
-- - non-empty bio
-- - at least 1 social link (with URL)
-- - at least 1 business idea

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE profiles
SET profile_onboarding_completed =
  (COALESCE(NULLIF(trim(display_name), ''), '') <> '')
  AND (COALESCE(NULLIF(trim(bio), ''), '') <> '')
  AND (
    CASE
      WHEN jsonb_typeof(social_links) = 'array' THEN jsonb_array_length(social_links) > 0
      ELSE FALSE
    END
  )
  AND (
    (
      CASE
        WHEN jsonb_typeof(business_ideas) = 'array' THEN jsonb_array_length(business_ideas) > 0
        ELSE FALSE
      END
    )
    OR (COALESCE(NULLIF(trim(business_idea), ''), '') <> '')
  );
