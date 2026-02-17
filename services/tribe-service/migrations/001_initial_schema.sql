-- ============================================================================
-- FoundersTribe — Complete Database Migration
-- ============================================================================
-- Version: 001_initial_schema
-- Target:  Supabase (PostgreSQL 15+)
-- Purpose: Production-grade schema for high-scale community messaging
--
-- NOTE: Message tables prefixed with "tribe_" to avoid conflict with
--       existing "messages" table in the database.
--
-- Run:  psql $DATABASE_URL -f 001_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE tribe_role    AS ENUM ('owner', 'admin', 'moderator', 'member');
CREATE TYPE group_type    AS ENUM ('announcement', 'subtribe');
CREATE TYPE group_role    AS ENUM ('admin', 'member');
CREATE TYPE message_type  AS ENUM ('text', 'image', 'video', 'audio', 'file', 'system');
CREATE TYPE invite_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE audit_action  AS ENUM (
  'tribe_created',  'tribe_updated',  'tribe_deleted',
  'member_joined',  'member_left',    'member_banned',  'member_unbanned',
  'group_created',  'group_updated',  'group_deleted',
  'message_deleted','role_changed',   'invite_created'
);


-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ---------- profiles (extends auth.users) ----------
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL
                  CHECK (length(username) BETWEEN 3 AND 30),
  display_name  TEXT NOT NULL
                  CHECK (length(display_name) BETWEEN 1 AND 50),
  avatar_url    TEXT,
  bio           TEXT CHECK (length(bio) <= 500),
  is_online     BOOLEAN DEFAULT FALSE,
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at    TIMESTAMPTZ
);

-- ---------- tribes ----------
CREATE TABLE tribes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description   TEXT CHECK (length(description) <= 1000),
  avatar_url    TEXT,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  member_count  INTEGER DEFAULT 0 NOT NULL CHECK (member_count >= 0),
  is_public     BOOLEAN DEFAULT TRUE,
  max_members   INTEGER DEFAULT 10000,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at    TIMESTAMPTZ
);

-- ---------- tribe_members ----------
CREATE TABLE tribe_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id    UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        tribe_role DEFAULT 'member' NOT NULL,
  joined_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  muted_until TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ,

  UNIQUE (tribe_id, user_id)
);

-- ---------- groups (announcement + subtribes) ----------
CREATE TABLE groups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id         UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  name             TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description      TEXT CHECK (length(description) <= 500),
  type             group_type NOT NULL,
  avatar_url       TEXT,
  created_by       UUID NOT NULL REFERENCES profiles(id),
  member_count     INTEGER DEFAULT 0 NOT NULL CHECK (member_count >= 0),
  message_count    BIGINT  DEFAULT 0 NOT NULL CHECK (message_count >= 0),
  last_message_at  TIMESTAMPTZ,
  max_members      INTEGER DEFAULT 5000,
  is_readonly      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at       TIMESTAMPTZ
);

-- ---------- group_members ----------
CREATE TABLE group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       group_role DEFAULT 'member' NOT NULL,
  joined_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,

  UNIQUE (group_id, user_id)
);

-- ---------- tribe_messages (range-partitioned by month) ----------
CREATE TABLE tribe_messages (
  id              UUID DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL,
  sender_id       UUID NOT NULL,
  type            message_type DEFAULT 'text' NOT NULL,
  content         TEXT CHECK (length(content) <= 10000),
  media_url       TEXT,
  media_metadata  JSONB,
  reply_to_id     UUID,
  is_edited       BOOLEAN DEFAULT FALSE,
  edited_at       TIMESTAMPTZ,
  reaction_count  INTEGER DEFAULT 0 NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at      TIMESTAMPTZ,

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE tribe_messages_y2026_m01 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE tribe_messages_y2026_m02 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE tribe_messages_y2026_m03 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE tribe_messages_y2026_m04 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE tribe_messages_y2026_m05 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE tribe_messages_y2026_m06 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE tribe_messages_y2026_m07 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE tribe_messages_y2026_m08 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE tribe_messages_y2026_m09 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE tribe_messages_y2026_m10 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE tribe_messages_y2026_m11 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE tribe_messages_y2026_m12 PARTITION OF tribe_messages
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- ---------- tribe_message_reactions ----------
CREATE TABLE tribe_message_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL CHECK (length(emoji) BETWEEN 1 AND 20),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE (message_id, user_id, emoji)
);

-- ---------- tribe_message_reads ----------
CREATE TABLE tribe_message_reads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_msg_id  UUID,
  last_read_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  unread_count      INTEGER DEFAULT 0 NOT NULL,

  UNIQUE (group_id, user_id)
);

-- ---------- invite_links ----------
CREATE TABLE invite_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id    UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  code        TEXT UNIQUE NOT NULL CHECK (length(code) BETWEEN 6 AND 20),
  created_by  UUID NOT NULL REFERENCES profiles(id),
  max_uses    INTEGER,
  use_count   INTEGER DEFAULT 0 NOT NULL,
  status      invite_status DEFAULT 'active' NOT NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------- banned_users ----------
CREATE TABLE banned_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id   UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by  UUID NOT NULL REFERENCES profiles(id),
  reason     TEXT CHECK (length(reason) <= 500),
  banned_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,

  UNIQUE (tribe_id, user_id)
);

-- ---------- audit_logs ----------
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id    UUID REFERENCES tribes(id) ON DELETE SET NULL,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  target_type TEXT,
  target_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username  ON profiles (username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles (last_seen_at DESC);

-- tribes
CREATE INDEX idx_tribes_created_by   ON tribes (created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_tribes_public       ON tribes (is_public, created_at DESC) WHERE deleted_at IS NULL;

-- tribe_members
CREATE INDEX idx_tribe_members_user  ON tribe_members (user_id, tribe_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tribe_members_tribe ON tribe_members (tribe_id, role) WHERE deleted_at IS NULL;

-- groups
CREATE INDEX idx_groups_tribe        ON groups (tribe_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_groups_last_msg     ON groups (tribe_id, last_message_at DESC NULLS LAST) WHERE deleted_at IS NULL;

-- group_members
CREATE INDEX idx_group_members_user  ON group_members (user_id, group_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_group_members_group ON group_members (group_id, role) WHERE deleted_at IS NULL;

-- tribe_messages (critical: cursor-based pagination index)
CREATE INDEX idx_tribe_messages_group_cursor ON tribe_messages (group_id, created_at DESC, id);
CREATE INDEX idx_tribe_messages_sender       ON tribe_messages (sender_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_tribe_messages_reply        ON tribe_messages (reply_to_id) WHERE reply_to_id IS NOT NULL;

-- tribe_message_reactions
CREATE INDEX idx_tribe_reactions_message ON tribe_message_reactions (message_id);
CREATE INDEX idx_tribe_reactions_user    ON tribe_message_reactions (user_id, message_id);

-- tribe_message_reads
CREATE INDEX idx_tribe_reads_user ON tribe_message_reads (user_id, group_id);

-- invite_links
CREATE INDEX idx_invites_code  ON invite_links (code) WHERE status = 'active';
CREATE INDEX idx_invites_tribe ON invite_links (tribe_id, status);

-- banned_users
CREATE INDEX idx_bans_tribe_user ON banned_users (tribe_id, user_id);
CREATE INDEX idx_bans_user       ON banned_users (user_id);

-- audit_logs
CREATE INDEX idx_audit_tribe ON audit_logs (tribe_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs (actor_id, created_at DESC);


-- ============================================================================
-- 4. HELPER FUNCTIONS (used by RLS policies)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_tribe_member(p_tribe_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tribe_members
    WHERE tribe_id = p_tribe_id
      AND user_id  = auth.uid()
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_tribe_role(p_tribe_id UUID, p_roles tribe_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tribe_members
    WHERE tribe_id = p_tribe_id
      AND user_id  = auth.uid()
      AND role     = ANY(p_roles)
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
      AND role     = 'admin'
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_banned(p_tribe_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM banned_users
    WHERE tribe_id = p_tribe_id
      AND user_id  = auth.uid()
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- updated_at auto-maintenance
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_tribes_updated_at
  BEFORE UPDATE ON tribes FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- Auto-create announcement group + owner on new tribe
CREATE OR REPLACE FUNCTION fn_tribe_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO groups (tribe_id, name, description, type, created_by, is_readonly)
  VALUES (NEW.id, NEW.name || ' — Announcements', 'Official announcements for ' || NEW.name, 'announcement', NEW.created_by, TRUE);

  INSERT INTO tribe_members (tribe_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');

  UPDATE tribes SET member_count = 1 WHERE id = NEW.id;

  INSERT INTO audit_logs (tribe_id, actor_id, action, target_type, target_id)
  VALUES (NEW.id, NEW.created_by, 'tribe_created', 'tribe', NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tribe_after_insert
  AFTER INSERT ON tribes FOR EACH ROW EXECUTE FUNCTION fn_tribe_after_insert();

-- Auto-add tribe members to announcement group
CREATE OR REPLACE FUNCTION fn_tribe_member_after_insert()
RETURNS TRIGGER AS $$
DECLARE v_ann_group UUID;
BEGIN
  SELECT id INTO v_ann_group FROM groups
  WHERE tribe_id = NEW.tribe_id AND type = 'announcement' AND deleted_at IS NULL LIMIT 1;

  IF v_ann_group IS NOT NULL THEN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_ann_group, NEW.user_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
    UPDATE groups SET member_count = member_count + 1 WHERE id = v_ann_group;
  END IF;

  UPDATE tribes SET member_count = member_count + 1 WHERE id = NEW.tribe_id;

  INSERT INTO audit_logs (tribe_id, actor_id, action, target_type, target_id)
  VALUES (NEW.tribe_id, NEW.user_id, 'member_joined', 'user', NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tribe_member_after_insert
  AFTER INSERT ON tribe_members FOR EACH ROW EXECUTE FUNCTION fn_tribe_member_after_insert();

-- Update group stats on new message
CREATE OR REPLACE FUNCTION fn_tribe_message_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups SET last_message_at = NEW.created_at, message_count = message_count + 1, updated_at = NOW()
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tribe_message_after_insert
  AFTER INSERT ON tribe_messages FOR EACH ROW EXECUTE FUNCTION fn_tribe_message_after_insert();

-- Maintain reaction count
CREATE OR REPLACE FUNCTION fn_tribe_reaction_count_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tribe_messages SET reaction_count = reaction_count + 1 WHERE id = NEW.message_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tribe_messages SET reaction_count = reaction_count - 1 WHERE id = OLD.message_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tribe_reaction_insert
  AFTER INSERT ON tribe_message_reactions FOR EACH ROW EXECUTE FUNCTION fn_tribe_reaction_count_update();
CREATE TRIGGER trg_tribe_reaction_delete
  AFTER DELETE ON tribe_message_reactions FOR EACH ROW EXECUTE FUNCTION fn_tribe_reaction_count_update();

-- Soft delete cascade: tribe → groups + members
CREATE OR REPLACE FUNCTION fn_tribe_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE groups SET deleted_at = NOW() WHERE tribe_id = NEW.id AND deleted_at IS NULL;
    UPDATE tribe_members SET deleted_at = NOW() WHERE tribe_id = NEW.id AND deleted_at IS NULL;
    INSERT INTO audit_logs (tribe_id, actor_id, action, target_type, target_id)
    VALUES (NEW.id, auth.uid(), 'tribe_deleted', 'tribe', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tribe_soft_delete
  AFTER UPDATE OF deleted_at ON tribes FOR EACH ROW EXECUTE FUNCTION fn_tribe_soft_delete();

-- Decrement counts on member leave
CREATE OR REPLACE FUNCTION fn_tribe_member_soft_delete()
RETURNS TRIGGER AS $$
DECLARE v_ann_group UUID;
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE tribes SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.tribe_id;
    SELECT id INTO v_ann_group FROM groups
    WHERE tribe_id = NEW.tribe_id AND type = 'announcement' AND deleted_at IS NULL LIMIT 1;
    IF v_ann_group IS NOT NULL THEN
      UPDATE group_members SET deleted_at = NOW()
      WHERE group_id = v_ann_group AND user_id = NEW.user_id AND deleted_at IS NULL;
      UPDATE groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = v_ann_group;
    END IF;
    INSERT INTO audit_logs (tribe_id, actor_id, action, target_type, target_id)
    VALUES (NEW.tribe_id, NEW.user_id, 'member_left', 'user', NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tribe_member_soft_delete
  AFTER UPDATE OF deleted_at ON tribe_members FOR EACH ROW EXECUTE FUNCTION fn_tribe_member_soft_delete();

-- Group member count triggers
CREATE OR REPLACE FUNCTION fn_group_member_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_group_member_after_insert
  AFTER INSERT ON group_members FOR EACH ROW EXECUTE FUNCTION fn_group_member_after_insert();

CREATE OR REPLACE FUNCTION fn_group_member_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.group_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_group_member_soft_delete
  AFTER UPDATE OF deleted_at ON group_members FOR EACH ROW EXECUTE FUNCTION fn_group_member_soft_delete();

-- Auto-create future partitions
CREATE OR REPLACE FUNCTION create_tribe_msg_partition()
RETURNS VOID AS $$
DECLARE
  v_start DATE; v_end DATE; v_name TEXT;
BEGIN
  v_start := date_trunc('month', NOW() + INTERVAL '1 month')::DATE;
  v_end   := (v_start + INTERVAL '1 month')::DATE;
  v_name  := 'tribe_messages_y' || to_char(v_start, 'YYYY') || '_m' || to_char(v_start, 'MM');
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = v_name) THEN
    EXECUTE format('CREATE TABLE %I PARTITION OF tribe_messages FOR VALUES FROM (%L) TO (%L)', v_name, v_start, v_end);
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 6. ENABLE ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups                ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_message_reads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- profiles
CREATE POLICY profiles_select ON profiles FOR SELECT
  TO authenticated USING (deleted_at IS NULL);
CREATE POLICY profiles_update ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_insert ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

-- tribes
CREATE POLICY tribes_select ON tribes FOR SELECT
  TO authenticated USING (deleted_at IS NULL AND (is_public = TRUE OR is_tribe_member(id)));
CREATE POLICY tribes_insert ON tribes FOR INSERT
  TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY tribes_update ON tribes FOR UPDATE
  TO authenticated
  USING (has_tribe_role(id, ARRAY['owner', 'admin']::tribe_role[]))
  WITH CHECK (has_tribe_role(id, ARRAY['owner', 'admin']::tribe_role[]));

-- tribe_members
CREATE POLICY tribe_members_select ON tribe_members FOR SELECT
  TO authenticated USING (is_tribe_member(tribe_id) AND deleted_at IS NULL);
CREATE POLICY tribe_members_insert ON tribe_members FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() AND NOT is_banned(tribe_id));
CREATE POLICY tribe_members_update ON tribe_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));

-- groups
CREATE POLICY groups_select ON groups FOR SELECT
  TO authenticated USING (is_tribe_member(tribe_id) AND deleted_at IS NULL);
CREATE POLICY groups_insert ON groups FOR INSERT
  TO authenticated WITH CHECK (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));
CREATE POLICY groups_update ON groups FOR UPDATE
  TO authenticated USING (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));

-- group_members
CREATE POLICY group_members_select ON group_members FOR SELECT
  TO authenticated USING (is_group_member(group_id) AND deleted_at IS NULL);
CREATE POLICY group_members_insert ON group_members FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND is_tribe_member(g.tribe_id) AND g.deleted_at IS NULL)
  );
CREATE POLICY group_members_update ON group_members FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR is_group_admin(group_id));

-- tribe_messages
CREATE POLICY tribe_messages_select ON tribe_messages FOR SELECT
  TO authenticated USING (is_group_member(group_id) AND deleted_at IS NULL);
CREATE POLICY tribe_messages_insert ON tribe_messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid() AND is_group_member(group_id)
    AND (NOT EXISTS (SELECT 1 FROM groups WHERE id = group_id AND is_readonly = TRUE) OR is_group_admin(group_id))
  );
CREATE POLICY tribe_messages_update ON tribe_messages FOR UPDATE
  TO authenticated USING (sender_id = auth.uid());
CREATE POLICY tribe_messages_admin_delete ON tribe_messages FOR UPDATE
  TO authenticated USING (is_group_admin(group_id));

-- tribe_message_reactions
CREATE POLICY tribe_reactions_select ON tribe_message_reactions FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM tribe_messages m WHERE m.id = message_id AND is_group_member(m.group_id)));
CREATE POLICY tribe_reactions_insert ON tribe_message_reactions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY tribe_reactions_delete ON tribe_message_reactions FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- tribe_message_reads
CREATE POLICY tribe_reads_select ON tribe_message_reads FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY tribe_reads_insert ON tribe_message_reads FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY tribe_reads_update ON tribe_message_reads FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- invite_links
CREATE POLICY invites_select ON invite_links FOR SELECT
  TO authenticated USING (is_tribe_member(tribe_id));
CREATE POLICY invites_insert ON invite_links FOR INSERT
  TO authenticated WITH CHECK (has_tribe_role(tribe_id, ARRAY['owner', 'admin', 'moderator']::tribe_role[]));
CREATE POLICY invites_update ON invite_links FOR UPDATE
  TO authenticated USING (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));

-- banned_users
CREATE POLICY bans_select ON banned_users FOR SELECT
  TO authenticated USING (has_tribe_role(tribe_id, ARRAY['owner', 'admin', 'moderator']::tribe_role[]));
CREATE POLICY bans_insert ON banned_users FOR INSERT
  TO authenticated WITH CHECK (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));
CREATE POLICY bans_delete ON banned_users FOR DELETE
  TO authenticated USING (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));

-- audit_logs
CREATE POLICY audit_select ON audit_logs FOR SELECT
  TO authenticated USING (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));
CREATE POLICY audit_no_direct_insert ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (FALSE);


-- ============================================================================
-- 8. STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tribe-media', 'tribe-media', FALSE, 52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/ogg','audio/webm','application/pdf']
);

CREATE POLICY storage_tribe_upload ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'tribe-media' AND (
      ((storage.foldername(name))[1] = 'profiles' AND (storage.foldername(name))[2] = auth.uid()::text)
      OR ((storage.foldername(name))[1] = 'messages' AND is_group_member((storage.foldername(name))[2]::UUID))
      OR ((storage.foldername(name))[1] = 'tribes' AND has_tribe_role((storage.foldername(name))[2]::UUID, ARRAY['owner','admin']::tribe_role[]))
    )
  );

CREATE POLICY storage_tribe_download ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'tribe-media' AND (
      (storage.foldername(name))[1] = 'profiles'
      OR ((storage.foldername(name))[1] = 'messages' AND is_group_member((storage.foldername(name))[2]::UUID))
      OR (storage.foldername(name))[1] = 'tribes'
    )
  );

CREATE POLICY storage_tribe_delete ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'tribe-media' AND (
      ((storage.foldername(name))[1] = 'profiles' AND (storage.foldername(name))[2] = auth.uid()::text)
      OR ((storage.foldername(name))[1] = 'tribes' AND has_tribe_role((storage.foldername(name))[2]::UUID, ARRAY['owner','admin']::tribe_role[]))
    )
  );


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
