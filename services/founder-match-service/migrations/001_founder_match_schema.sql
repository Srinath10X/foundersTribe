-- ============================================================================
-- Founder Match Service — Schema
-- ============================================================================
-- Version: 001_founder_match_schema
-- Target:  Supabase (PostgreSQL 15+)
-- Purpose: Matching, swipes, chat, moderation, notifications, analytics
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE founder_role AS ENUM ('tech', 'business', 'design', 'growth');
CREATE TYPE founder_looking_for AS ENUM ('tech', 'business', 'either');
CREATE TYPE founder_stage AS ENUM ('idea', 'mvp', 'revenue');
CREATE TYPE founder_commitment AS ENUM ('full_time', 'part_time', 'exploring');

CREATE TYPE swipe_type AS ENUM ('pass', 'interested', 'super');
CREATE TYPE match_status AS ENUM ('active', 'unmatched');
CREATE TYPE notification_type AS ENUM (
  'match_created',
  'new_message',
  'super_like_received'
);
CREATE TYPE analytics_event_type AS ENUM (
  'swipe',
  'match_created',
  'conversation_started',
  'first_message_sent',
  'retention_after_match'
);

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ---------- founder_profiles ----------
CREATE TABLE IF NOT EXISTS founder_profiles (
  user_id                  UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  role                     founder_role NOT NULL,
  looking_for              founder_looking_for NOT NULL,
  stage                    founder_stage NOT NULL,
  commitment               founder_commitment NOT NULL,
  industry_tags            TEXT[] NOT NULL DEFAULT '{}',
  pitch_short              TEXT NOT NULL CHECK (length(pitch_short) <= 200),
  location                 TEXT,
  profile_completion_pct   INTEGER NOT NULL DEFAULT 0 CHECK (profile_completion_pct BETWEEN 0 AND 100),
  verified                 BOOLEAN NOT NULL DEFAULT FALSE,
  projects_built           INTEGER NOT NULL DEFAULT 0 CHECK (projects_built >= 0),
  last_active_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  swipe_cooldown_until     TIMESTAMPTZ,
  abnormal_unmatch_flag    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- skill_catalog ----------
CREATE TABLE IF NOT EXISTS skill_catalog (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- user_skill_links ----------
CREATE TABLE IF NOT EXISTS user_skill_links (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id    INTEGER NOT NULL REFERENCES skill_catalog(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, skill_id)
);

-- ---------- user_blocks ----------
CREATE TABLE IF NOT EXISTS user_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason      TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);

-- ---------- user_reports ----------
CREATE TABLE IF NOT EXISTS user_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id      UUID,
  reason        TEXT NOT NULL CHECK (length(reason) <= 1000),
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID,
  status        TEXT NOT NULL DEFAULT 'open'
);

-- ---------- swipe_actions ----------
CREATE TABLE IF NOT EXISTS swipe_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        swipe_type NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (swiper_id, target_id)
);

-- ---------- user_matches ----------
CREATE TABLE IF NOT EXISTS user_matches (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id                    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id                    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  compatibility_score         SMALLINT NOT NULL CHECK (compatibility_score BETWEEN 0 AND 100),
  compatibility_breakdown     JSONB NOT NULL,
  commitment_aligned          BOOLEAN NOT NULL,
  role_complement             BOOLEAN NOT NULL,
  stage_aligned               BOOLEAN NOT NULL,
  skill_overlap_score         SMALLINT,
  industry_overlap_count      SMALLINT,
  status                      match_status NOT NULL DEFAULT 'active',
  unmatched_by                UUID REFERENCES profiles(id),
  unmatched_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at             TIMESTAMPTZ,
  user1_last_read_message_id  UUID,
  user2_last_read_message_id  UUID,
  CHECK (user1_id <> user2_id),
  CHECK (user1_id < user2_id),
  UNIQUE (user1_id, user2_id)
);

-- ---------- chat_messages ----------
CREATE TABLE IF NOT EXISTS chat_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id            UUID NOT NULL REFERENCES user_matches(id) ON DELETE CASCADE,
  sender_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content             TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  seen_by_other_at    TIMESTAMPTZ
);

-- ---------- user_notifications ----------
CREATE TABLE IF NOT EXISTS user_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  payload     JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

-- ---------- analytics_logs ----------
CREATE TABLE IF NOT EXISTS analytics_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type  analytics_event_type NOT NULL,
  event_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- founder_profiles
CREATE INDEX IF NOT EXISTS idx_founder_profiles_role_stage_commitment
  ON founder_profiles (role, stage, commitment);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_activity
  ON founder_profiles (last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_completion
  ON founder_profiles (profile_completion_pct DESC);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_industry_tags_gin
  ON founder_profiles USING GIN (industry_tags);

-- user_skill_links
CREATE INDEX IF NOT EXISTS idx_user_skill_links_skill
  ON user_skill_links (skill_id);

-- user_blocks
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_blocked
  ON user_blocks (blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
  ON user_blocks (blocked_id);

-- user_reports
CREATE INDEX IF NOT EXISTS idx_user_reports_reported
  ON user_reports (reported_id, created_at DESC);

-- swipe_actions
CREATE INDEX IF NOT EXISTS idx_swipe_actions_swiper_created
  ON swipe_actions (swiper_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_swipe_actions_target_created
  ON swipe_actions (target_id, created_at DESC);

-- user_matches
CREATE INDEX IF NOT EXISTS idx_user_matches_user1
  ON user_matches (user1_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_matches_user2
  ON user_matches (user2_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_matches_last_message
  ON user_matches (last_message_at DESC);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_match_cursor
  ON chat_messages (match_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
  ON chat_messages (sender_id, created_at DESC);

-- user_notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read
  ON user_notifications (user_id, is_read, created_at DESC);

-- analytics_logs
CREATE INDEX IF NOT EXISTS idx_analytics_event_type_time
  ON analytics_logs (event_type, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_time
  ON analytics_logs (user_id, event_time DESC);

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_founder_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_founder_profiles_updated_at
  BEFORE UPDATE ON founder_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_founder_profiles_updated_at();

