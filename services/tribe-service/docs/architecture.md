# FoundersTribe — Production Backend Architecture

> **Target**: Millions of users, millions of messages/day, sub-100ms realtime delivery.
> **Stack**: Supabase (PostgreSQL 15+, GoTrue Auth, Realtime, Storage), Redis, Edge Functions.

---

## 1. SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│  React Native (Mobile)  ·  Next.js (Web)  ·  Admin Dashboard        │
│  ↕ HTTPS/WSS                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                   API GATEWAY / EDGE LAYER                          │
│  Supabase Edge Functions (Deno)  ·  Nginx Reverse Proxy             │
│  Rate Limiter (Redis)  ·  JWT Validation (GoTrue)                   │
├─────────────────────────────────────────────────────────────────────┤
│                     SERVICE LAYER                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ Tribe Service│ │ Message Svc  │ │ Media Service │                │
│  │ (CRUD, RLS)  │ │ (PostgREST)  │ │ (Storage API) │               │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘                │
│         │                │                │                         │
├─────────┼────────────────┼────────────────┼─────────────────────────┤
│         ▼                ▼                ▼                         │
│  ┌──────────────────────────────────────────────────────┐           │
│  │              SUPABASE PLATFORM                        │          │
│  │  PostgreSQL 15  ·  PostgREST  ·  GoTrue Auth          │         │
│  │  Realtime (Phoenix)  ·  Storage (S3-compat)            │         │
│  │  pg_cron  ·  pg_net                                    │         │
│  └──────────────────────────────────────────────────────┘           │
│         │                                                           │
│  ┌──────▼───────┐                                                   │
│  │    Redis      │  Session cache · rate limits · typing indicators  │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Authentication**: Client → GoTrue → JWT issued → all subsequent requests carry JWT.
2. **Read path**: Client → PostgREST → PostgreSQL (RLS enforced) → JSON response. Read replicas serve `GET` requests.
3. **Write path**: Client → PostgREST/Edge Function → PostgreSQL primary → triggers fire → Realtime broadcasts change via Postgres CDC.
4. **Realtime**: Client opens WSS to Supabase Realtime server → subscribes to channel (e.g., `group:{group_id}`) → server pushes `INSERT`/`UPDATE`/`DELETE` events filtered by RLS.
5. **Media**: Client → Supabase Storage (S3) → returns signed URL → URL stored in `messages.media_url`.

### Scalability Considerations

| Concern | Strategy |
|---------|----------|
| Read-heavy traffic (90/10 split) | Read replicas, materialized views for counts, cursor pagination |
| Message volume (millions/day) | Range-partitioned `messages` table by `created_at` (monthly) |
| Realtime fan-out | Channel-per-group, server-side filtering, max 1000 members/group |
| Storage | Supabase Storage (S3-backed) + CDN (Cloudflare/Fastly) |
| Auth | Supabase GoTrue (stateless JWT, no session DB) |
| Hot-path caching | Redis: unread counts, typing indicators, rate limits, last-seen |

### Caching Strategy

```
Layer 1: Client-side (React Query / SWR with stale-while-revalidate)
Layer 2: Redis (TTL-based)
  - tribe_members:{tribe_id}      → 60s TTL (membership roster)
  - unread:{user_id}:{group_id}   → 30s TTL (unread badge count)
  - typing:{group_id}             → 5s TTL (typing indicator set)
  - rate_limit:{user_id}:{action} → sliding window
Layer 3: PostgreSQL (materialized views refreshed by pg_cron)
  - mv_group_message_counts       → refreshed every 5 min
```

---

## 2. COMPLETE DATABASE SCHEMA

### Enum Types

```sql
CREATE TYPE tribe_role AS ENUM ('owner', 'admin', 'moderator', 'member');
CREATE TYPE group_type AS ENUM ('announcement', 'subtribe');
CREATE TYPE group_role AS ENUM ('admin', 'member');
CREATE TYPE message_type AS ENUM ('text', 'image', 'video', 'audio', 'file', 'system');
CREATE TYPE invite_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE audit_action AS ENUM (
  'tribe_created', 'tribe_updated', 'tribe_deleted',
  'member_joined', 'member_left', 'member_banned', 'member_unbanned',
  'group_created', 'group_updated', 'group_deleted',
  'message_deleted', 'role_changed', 'invite_created'
);
```

### Table: `profiles`

```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL CHECK (length(username) BETWEEN 3 AND 30),
  display_name  TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 50),
  avatar_url    TEXT,
  bio           TEXT CHECK (length(bio) <= 500),
  is_online     BOOLEAN DEFAULT FALSE,
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at    TIMESTAMPTZ  -- soft delete
);
```

### Table: `tribes`

```sql
CREATE TABLE tribes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description     TEXT CHECK (length(description) <= 1000),
  avatar_url      TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  member_count    INTEGER DEFAULT 0 NOT NULL CHECK (member_count >= 0),
  is_public       BOOLEAN DEFAULT TRUE,
  max_members     INTEGER DEFAULT 10000,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at      TIMESTAMPTZ  -- soft delete
);
```

### Table: `tribe_members`

```sql
CREATE TABLE tribe_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id    UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        tribe_role DEFAULT 'member' NOT NULL,
  joined_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  muted_until TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ,  -- soft delete = "left"

  UNIQUE (tribe_id, user_id)
);
```

### Table: `groups`

```sql
CREATE TABLE groups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id         UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  name             TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description      TEXT CHECK (length(description) <= 500),
  type             group_type NOT NULL,
  avatar_url       TEXT,
  created_by       UUID NOT NULL REFERENCES profiles(id),
  member_count     INTEGER DEFAULT 0 NOT NULL CHECK (member_count >= 0),
  message_count    BIGINT DEFAULT 0 NOT NULL CHECK (message_count >= 0),
  last_message_at  TIMESTAMPTZ,
  max_members      INTEGER DEFAULT 5000,
  is_readonly      BOOLEAN DEFAULT FALSE,  -- true for announcement groups
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at       TIMESTAMPTZ
);
```

### Table: `group_members`

```sql
CREATE TABLE group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       group_role DEFAULT 'member' NOT NULL,
  joined_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,

  UNIQUE (group_id, user_id)
);
```

### Table: `messages` (Partitioned)

```sql
CREATE TABLE messages (
  id              UUID DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL,  -- FK enforced per partition
  sender_id       UUID NOT NULL,  -- FK enforced via trigger
  type            message_type DEFAULT 'text' NOT NULL,
  content         TEXT CHECK (length(content) <= 10000),
  media_url       TEXT,
  media_metadata  JSONB,          -- {width, height, duration, mime_type, size_bytes}
  reply_to_id     UUID,           -- self-reference for threads
  is_edited       BOOLEAN DEFAULT FALSE,
  edited_at       TIMESTAMPTZ,
  reaction_count  INTEGER DEFAULT 0 NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at      TIMESTAMPTZ,

  PRIMARY KEY (id, created_at)    -- required for range partitioning
) PARTITION BY RANGE (created_at);

-- Create initial partitions (monthly)
CREATE TABLE messages_y2026_m01 PARTITION OF messages
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE messages_y2026_m02 PARTITION OF messages
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE messages_y2026_m03 PARTITION OF messages
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE messages_y2026_m04 PARTITION OF messages
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE messages_y2026_m05 PARTITION OF messages
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE messages_y2026_m06 PARTITION OF messages
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

### Table: `message_reactions`

```sql
CREATE TABLE message_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL,  -- FK enforced via trigger (partitioned parent)
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL CHECK (length(emoji) BETWEEN 1 AND 20),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE (message_id, user_id, emoji)
);
```

### Table: `message_reads`

```sql
CREATE TABLE message_reads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_msg_id  UUID,         -- latest message the user has seen
  last_read_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  unread_count      INTEGER DEFAULT 0 NOT NULL,

  UNIQUE (group_id, user_id)
);
```

### Table: `invite_links`

```sql
CREATE TABLE invite_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id    UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  code        TEXT UNIQUE NOT NULL CHECK (length(code) BETWEEN 6 AND 20),
  created_by  UUID NOT NULL REFERENCES profiles(id),
  max_uses    INTEGER,           -- NULL = unlimited
  use_count   INTEGER DEFAULT 0 NOT NULL,
  status      invite_status DEFAULT 'active' NOT NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Table: `banned_users`

```sql
CREATE TABLE banned_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id   UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by  UUID NOT NULL REFERENCES profiles(id),
  reason     TEXT CHECK (length(reason) <= 500),
  banned_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,  -- NULL = permanent

  UNIQUE (tribe_id, user_id)
);
```

### Table: `audit_logs`

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id    UUID REFERENCES tribes(id) ON DELETE SET NULL,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  target_type TEXT,          -- 'tribe', 'group', 'message', 'user'
  target_id   UUID,
  metadata    JSONB,         -- additional context
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

---

## 3. INDEXES (CRITICAL FOR PERFORMANCE)

```sql
-- profiles
CREATE INDEX idx_profiles_username ON profiles (username) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_last_seen ON profiles (last_seen_at DESC);

-- tribes
CREATE INDEX idx_tribes_created_by ON tribes (created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_tribes_public ON tribes (is_public, created_at DESC) WHERE deleted_at IS NULL;

-- tribe_members (hot path: membership checks)
CREATE INDEX idx_tribe_members_user ON tribe_members (user_id, tribe_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tribe_members_tribe ON tribe_members (tribe_id, role) WHERE deleted_at IS NULL;

-- groups
CREATE INDEX idx_groups_tribe ON groups (tribe_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_groups_last_msg ON groups (tribe_id, last_message_at DESC NULLS LAST) WHERE deleted_at IS NULL;

-- group_members (hot path: authorization checks)
CREATE INDEX idx_group_members_user ON group_members (user_id, group_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_group_members_group ON group_members (group_id, role) WHERE deleted_at IS NULL;

-- messages (partitioned — indexes apply per partition)
-- This is the single most important index in the system
CREATE INDEX idx_messages_group_cursor ON messages (group_id, created_at DESC, id);  -- cursor pagination
CREATE INDEX idx_messages_sender ON messages (sender_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_reply ON messages (reply_to_id) WHERE reply_to_id IS NOT NULL;

-- message_reactions
CREATE INDEX idx_reactions_message ON message_reactions (message_id);
CREATE INDEX idx_reactions_user ON message_reactions (user_id, message_id);

-- message_reads
CREATE INDEX idx_reads_user ON message_reads (user_id, group_id);

-- invite_links
CREATE INDEX idx_invites_code ON invite_links (code) WHERE status = 'active';
CREATE INDEX idx_invites_tribe ON invite_links (tribe_id, status);

-- banned_users
CREATE INDEX idx_bans_tribe_user ON banned_users (tribe_id, user_id);
CREATE INDEX idx_bans_user ON banned_users (user_id);

-- audit_logs (time-series queries)
CREATE INDEX idx_audit_tribe ON audit_logs (tribe_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs (actor_id, created_at DESC);
```

---

## 4. AUTOMATIC TRIGGERS

### Auto-create announcement group when tribe is created

```sql
CREATE OR REPLACE FUNCTION fn_tribe_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the default announcement group
  INSERT INTO groups (tribe_id, name, description, type, created_by, is_readonly)
  VALUES (
    NEW.id,
    NEW.name || ' — Announcements',
    'Official announcements for ' || NEW.name,
    'announcement',
    NEW.created_by,
    TRUE
  );

  -- Add creator as tribe owner
  INSERT INTO tribe_members (tribe_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');

  -- Update member count
  UPDATE tribes SET member_count = 1 WHERE id = NEW.id;

  -- Audit log
  INSERT INTO audit_logs (tribe_id, actor_id, action, target_type, target_id)
  VALUES (NEW.id, NEW.created_by, 'tribe_created', 'tribe', NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tribe_after_insert
AFTER INSERT ON tribes
FOR EACH ROW EXECUTE FUNCTION fn_tribe_after_insert();
```

### Auto-add members to announcement group when they join a tribe

```sql
CREATE OR REPLACE FUNCTION fn_tribe_member_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_announcement_group_id UUID;
BEGIN
  -- Find the announcement group for this tribe
  SELECT id INTO v_announcement_group_id
  FROM groups
  WHERE tribe_id = NEW.tribe_id AND type = 'announcement' AND deleted_at IS NULL
  LIMIT 1;

  -- Add member to announcement group
  IF v_announcement_group_id IS NOT NULL THEN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_announcement_group_id, NEW.user_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;

    -- Update announcement group member count
    UPDATE groups SET member_count = member_count + 1
    WHERE id = v_announcement_group_id;
  END IF;

  -- Update tribe member count
  UPDATE tribes SET member_count = member_count + 1 WHERE id = NEW.tribe_id;

  -- Audit log
  INSERT INTO audit_logs (tribe_id, actor_id, action, target_type, target_id)
  VALUES (NEW.tribe_id, NEW.user_id, 'member_joined', 'user', NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tribe_member_after_insert
AFTER INSERT ON tribe_members
FOR EACH ROW EXECUTE FUNCTION fn_tribe_member_after_insert();
```

### Update last_message_at and message_count on new message

```sql
CREATE OR REPLACE FUNCTION fn_message_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups SET
    last_message_at = NEW.created_at,
    message_count = message_count + 1,
    updated_at = NOW()
  WHERE id = NEW.group_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_message_after_insert
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION fn_message_after_insert();
```

### Maintain reaction count

```sql
CREATE OR REPLACE FUNCTION fn_reaction_count_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE messages SET reaction_count = reaction_count + 1
    WHERE id = NEW.message_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE messages SET reaction_count = reaction_count - 1
    WHERE id = OLD.message_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reaction_insert
AFTER INSERT ON message_reactions
FOR EACH ROW EXECUTE FUNCTION fn_reaction_count_update();

CREATE TRIGGER trg_reaction_delete
AFTER DELETE ON message_reactions
FOR EACH ROW EXECUTE FUNCTION fn_reaction_count_update();
```

### Soft delete cascade — when tribe is soft-deleted, cascade to groups/members

```sql
CREATE OR REPLACE FUNCTION fn_tribe_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Soft-delete all groups
    UPDATE groups SET deleted_at = NOW() WHERE tribe_id = NEW.id AND deleted_at IS NULL;
    -- Soft-delete all memberships
    UPDATE tribe_members SET deleted_at = NOW() WHERE tribe_id = NEW.id AND deleted_at IS NULL;
    -- Audit
    INSERT INTO audit_logs (tribe_id, actor_id, action, target_type, target_id)
    VALUES (NEW.id, auth.uid(), 'tribe_deleted', 'tribe', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tribe_soft_delete
AFTER UPDATE OF deleted_at ON tribes
FOR EACH ROW EXECUTE FUNCTION fn_tribe_soft_delete();
```

### Decrement member counts on leave (soft-delete tribe_member)

```sql
CREATE OR REPLACE FUNCTION fn_tribe_member_soft_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_announcement_group_id UUID;
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Decrement tribe member count
    UPDATE tribes SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.tribe_id;

    -- Remove from announcement group
    SELECT id INTO v_announcement_group_id
    FROM groups WHERE tribe_id = NEW.tribe_id AND type = 'announcement' AND deleted_at IS NULL LIMIT 1;

    IF v_announcement_group_id IS NOT NULL THEN
      UPDATE group_members SET deleted_at = NOW()
      WHERE group_id = v_announcement_group_id AND user_id = NEW.user_id AND deleted_at IS NULL;
    END IF;

    -- Audit log
    INSERT INTO audit_logs (tribe_id, actor_id, action, target_type, target_id)
    VALUES (NEW.tribe_id, NEW.user_id, 'member_left', 'user', NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tribe_member_soft_delete
AFTER UPDATE OF deleted_at ON tribe_members
FOR EACH ROW EXECUTE FUNCTION fn_tribe_member_soft_delete();
```

### Updated_at auto-maintenance

```sql
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_tribes_updated_at BEFORE UPDATE ON tribes
FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_groups_updated_at BEFORE UPDATE ON groups
FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
```

---

## 5. ROW-LEVEL SECURITY (RLS)

### Enable RLS on all tables

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### Helper functions (used in policies)

```sql
-- Check if user is a member of a tribe (not soft-deleted)
CREATE OR REPLACE FUNCTION is_tribe_member(p_tribe_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tribe_members
    WHERE tribe_id = p_tribe_id AND user_id = auth.uid() AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has a specific role in a tribe
CREATE OR REPLACE FUNCTION has_tribe_role(p_tribe_id UUID, p_roles tribe_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tribe_members
    WHERE tribe_id = p_tribe_id AND user_id = auth.uid() AND role = ANY(p_roles) AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is a member of a group
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin of a group
CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is banned from a tribe
CREATE OR REPLACE FUNCTION is_banned(p_tribe_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM banned_users
    WHERE tribe_id = p_tribe_id AND user_id = auth.uid()
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### RLS Policies: `profiles`

```sql
-- Anyone authenticated can read profiles
CREATE POLICY profiles_select ON profiles FOR SELECT
  TO authenticated USING (deleted_at IS NULL);

-- Users can only update their own profile
CREATE POLICY profiles_update ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Profile created via trigger on auth.users, but allow insert if id matches
CREATE POLICY profiles_insert ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());
```

### RLS Policies: `tribes`

```sql
-- Users see tribes they belong to, or public tribes
CREATE POLICY tribes_select ON tribes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (is_public = TRUE OR is_tribe_member(id))
  );

-- Authenticated users can create tribes
CREATE POLICY tribes_insert ON tribes FOR INSERT
  TO authenticated WITH CHECK (created_by = auth.uid());

-- Only owner/admin can update tribe
CREATE POLICY tribes_update ON tribes FOR UPDATE
  TO authenticated
  USING (has_tribe_role(id, ARRAY['owner', 'admin']::tribe_role[]))
  WITH CHECK (has_tribe_role(id, ARRAY['owner', 'admin']::tribe_role[]));

-- Only owner can delete (soft-delete) tribe
CREATE POLICY tribes_delete ON tribes FOR UPDATE
  TO authenticated
  USING (has_tribe_role(id, ARRAY['owner']::tribe_role[]));
```

### RLS Policies: `tribe_members`

```sql
-- Members can see other members of their tribes
CREATE POLICY tribe_members_select ON tribe_members FOR SELECT
  TO authenticated
  USING (is_tribe_member(tribe_id) AND deleted_at IS NULL);

-- Users can join a tribe (insert themselves)
CREATE POLICY tribe_members_insert ON tribe_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT is_banned(tribe_id)
  );

-- Users can leave (soft-delete themselves), admins can remove members
CREATE POLICY tribe_members_update ON tribe_members FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[])
  );
```

### RLS Policies: `groups`

```sql
-- Members of the tribe can see its groups
CREATE POLICY groups_select ON groups FOR SELECT
  TO authenticated
  USING (is_tribe_member(tribe_id) AND deleted_at IS NULL);

-- Only tribe admin/owner can create groups
CREATE POLICY groups_insert ON groups FOR INSERT
  TO authenticated
  WITH CHECK (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));

-- Only tribe admin/owner can update groups
CREATE POLICY groups_update ON groups FOR UPDATE
  TO authenticated
  USING (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));
```

### RLS Policies: `group_members`

```sql
-- Group members can see other members
CREATE POLICY group_members_select ON group_members FOR SELECT
  TO authenticated
  USING (is_group_member(group_id) AND deleted_at IS NULL);

-- Users can join groups in tribes they belong to
CREATE POLICY group_members_insert ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND is_tribe_member(g.tribe_id) AND g.deleted_at IS NULL
    )
  );

-- Users can leave, admins can remove
CREATE POLICY group_members_update ON group_members FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_group_admin(group_id)
  );
```

### RLS Policies: `messages`

```sql
-- Only group members can read messages
CREATE POLICY messages_select ON messages FOR SELECT
  TO authenticated
  USING (is_group_member(group_id) AND deleted_at IS NULL);

-- Group members can send messages; announcement groups restricted to admins
CREATE POLICY messages_insert ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND is_group_member(group_id)
    AND (
      -- Non-readonly groups: any member can post
      NOT EXISTS (SELECT 1 FROM groups WHERE id = group_id AND is_readonly = TRUE)
      -- Readonly (announcement): only group admins
      OR is_group_admin(group_id)
    )
  );

-- Users can edit/soft-delete their own messages
CREATE POLICY messages_update ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

-- Admins can also delete any message in their group
CREATE POLICY messages_admin_delete ON messages FOR UPDATE
  TO authenticated
  USING (is_group_admin(group_id));
```

### RLS Policies: `message_reactions`

```sql
CREATE POLICY reactions_select ON message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m WHERE m.id = message_id AND is_group_member(m.group_id)
    )
  );

CREATE POLICY reactions_insert ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY reactions_delete ON message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```

### RLS Policies: `message_reads`

```sql
CREATE POLICY reads_select ON message_reads FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY reads_upsert ON message_reads FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY reads_update ON message_reads FOR UPDATE
  TO authenticated USING (user_id = auth.uid());
```

### RLS Policies: `invite_links`

```sql
-- Tribe members can see invites
CREATE POLICY invites_select ON invite_links FOR SELECT
  TO authenticated USING (is_tribe_member(tribe_id));

-- Only admin/owner can create invites
CREATE POLICY invites_insert ON invite_links FOR INSERT
  TO authenticated
  WITH CHECK (has_tribe_role(tribe_id, ARRAY['owner', 'admin', 'moderator']::tribe_role[]));

-- Admin/owner can revoke invites
CREATE POLICY invites_update ON invite_links FOR UPDATE
  TO authenticated
  USING (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));
```

### RLS Policies: `banned_users`

```sql
CREATE POLICY bans_select ON banned_users FOR SELECT
  TO authenticated USING (has_tribe_role(tribe_id, ARRAY['owner', 'admin', 'moderator']::tribe_role[]));

CREATE POLICY bans_insert ON banned_users FOR INSERT
  TO authenticated
  WITH CHECK (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));

CREATE POLICY bans_delete ON banned_users FOR DELETE
  TO authenticated
  USING (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));
```

### RLS Policies: `audit_logs`

```sql
-- Only owner/admin can view audit logs
CREATE POLICY audit_select ON audit_logs FOR SELECT
  TO authenticated
  USING (has_tribe_role(tribe_id, ARRAY['owner', 'admin']::tribe_role[]));

-- Inserts handled by SECURITY DEFINER triggers only
CREATE POLICY audit_insert ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (FALSE);  -- blocked; only triggers insert
```

---

## 6. API DESIGN (REST via PostgREST)

All endpoints prefixed with `/rest/v1/` (Supabase PostgREST) or `/functions/v1/` (Edge Functions).

### Authentication

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/auth/v1/signup` | Register with email/password |
| `POST` | `/auth/v1/token?grant_type=password` | Login |
| `POST` | `/auth/v1/token?grant_type=refresh_token` | Refresh JWT |
| `POST` | `/auth/v1/logout` | Logout |
| `GET`  | `/auth/v1/user` | Get current user |

### Tribes

| Method | Route | Body | Response | Errors |
|--------|-------|------|----------|--------|
| `GET` | `/rest/v1/tribes?is_public=eq.true&select=*&order=created_at.desc&limit=20` | — | `Tribe[]` | `401` |
| `GET` | `/rest/v1/tribes?id=eq.{id}&select=*,tribe_members(count)` | — | `Tribe` | `404` `403` |
| `POST` | `/rest/v1/tribes` | `{name, description, avatar_url, is_public}` | `Tribe` | `400` `401` |
| `PATCH` | `/rest/v1/tribes?id=eq.{id}` | `{name?, description?, avatar_url?}` | `Tribe` | `403` `404` |
| `PATCH` | `/rest/v1/tribes?id=eq.{id}` | `{deleted_at: now()}` | — | `403` (owner only) |

### Join / Leave Tribe

| Method | Route | Body | Response | Errors |
|--------|-------|------|----------|--------|
| `POST` | `/rest/v1/tribe_members` | `{tribe_id, user_id}` | `TribeMember` | `409` (already member) `403` (banned) |
| `PATCH` | `/rest/v1/tribe_members?tribe_id=eq.{tid}&user_id=eq.{uid}` | `{deleted_at: now()}` | — | `403` |

### Join via Invite

| Method | Route | Body | Response |
|--------|-------|------|----------|
| `POST` | `/functions/v1/join-via-invite` | `{invite_code}` | `{tribe_id, success}` |

Edge Function logic:
1. Look up `invite_links` by code where `status = 'active'` and `(expires_at IS NULL OR expires_at > NOW())`.
2. Check `max_uses` vs `use_count`.
3. Check user is not banned.
4. Insert into `tribe_members`.
5. Increment `use_count`.

### Groups (SubTribes)

| Method | Route | Body | Response |
|--------|-------|------|----------|
| `GET` | `/rest/v1/groups?tribe_id=eq.{tid}&select=*&order=last_message_at.desc.nullslast` | — | `Group[]` |
| `POST` | `/rest/v1/groups` | `{tribe_id, name, description, type: 'subtribe'}` | `Group` |
| `PATCH` | `/rest/v1/groups?id=eq.{gid}` | `{name?, description?}` | `Group` |

### Join / Leave Group

| Method | Route | Body | Response |
|--------|-------|------|----------|
| `POST` | `/rest/v1/group_members` | `{group_id, user_id}` | `GroupMember` |
| `PATCH` | `/rest/v1/group_members?group_id=eq.{gid}&user_id=eq.{uid}` | `{deleted_at: now()}` | — |

### Messages (Cursor-based Pagination)

| Method | Route | Body | Response |
|--------|-------|------|----------|
| `GET` | `/rest/v1/messages?group_id=eq.{gid}&created_at=lt.{cursor}&order=created_at.desc&limit=50&select=*,profiles!sender_id(display_name,avatar_url)` | — | `Message[]` |
| `POST` | `/rest/v1/messages` | `{group_id, content, type, media_url?, reply_to_id?}` | `Message` |
| `PATCH` | `/rest/v1/messages?id=eq.{mid}` | `{content, is_edited: true, edited_at: now()}` | `Message` |
| `PATCH` | `/rest/v1/messages?id=eq.{mid}` | `{deleted_at: now()}` | — |

**Cursor pagination**: The client sends `created_at` of the last message as cursor. The query uses `created_at < cursor` with `ORDER BY created_at DESC LIMIT 50`. No OFFSET. Index: `(group_id, created_at DESC, id)`.

### Reactions

| Method | Route | Body |
|--------|-------|------|
| `POST` | `/rest/v1/message_reactions` | `{message_id, user_id, emoji}` |
| `DELETE` | `/rest/v1/message_reactions?message_id=eq.{mid}&user_id=eq.{uid}&emoji=eq.{emoji}` | — |

### Read Receipts

| Method | Route | Body |
|--------|-------|------|
| `POST` | `/rest/v1/message_reads` | `{group_id, user_id, last_read_msg_id}` |
| `PATCH` | `/rest/v1/message_reads?group_id=eq.{gid}&user_id=eq.{uid}` | `{last_read_msg_id, last_read_at: now(), unread_count: 0}` |

### Invite Links

| Method | Route | Body |
|--------|-------|------|
| `POST` | `/rest/v1/invite_links` | `{tribe_id, code, max_uses?, expires_at?}` |
| `PATCH` | `/rest/v1/invite_links?id=eq.{id}` | `{status: 'revoked'}` |

### Ban / Unban

| Method | Route | Body |
|--------|-------|------|
| `POST` | `/rest/v1/banned_users` | `{tribe_id, user_id, banned_by, reason?}` |
| `DELETE` | `/rest/v1/banned_users?tribe_id=eq.{tid}&user_id=eq.{uid}` | — |

---

## 7. REALTIME DESIGN

### Channel Architecture

```
Channel pattern: "group:{group_id}"
```

Each group (announcement or subtribe) maps to one Supabase Realtime channel. Clients subscribe when they open a group conversation.

### Subscription Setup (Client)

```typescript
const channel = supabase
  .channel(`group:${groupId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `group_id=eq.${groupId}`,
  }, (payload) => {
    handleNewMessage(payload.new);
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'messages',
    filter: `group_id=eq.${groupId}`,
  }, (payload) => {
    handleMessageUpdate(payload.new); // edits, deletes
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'message_reactions',
    filter: `message_id=in.(${visibleMessageIds.join(',')})`,
  }, (payload) => {
    handleReactionChange(payload);
  })
  .subscribe();
```

### Typing Indicators (via Broadcast — no DB writes)

```typescript
// Send typing event (Supabase Broadcast, not Postgres Changes)
channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { user_id: currentUserId, display_name: 'Alex' }
});

// Listen
channel.on('broadcast', { event: 'typing' }, (payload) => {
  showTypingIndicator(payload.payload);
});
```

### Large Group Scaling

| Group size | Strategy |
|------------|----------|
| < 200 members | Direct channel subscription, all events |
| 200–1000 members | Batch notifications, debounce typing indicators to 3s |
| > 1000 members | Disable typing indicators, aggregate reactions, throttle broadcast to 1 event/sec |

### Throttling

- Typing indicator: client debounces to emit max once per 3 seconds.
- Message broadcasting: Supabase Realtime handles natively via Postgres CDC; no additional throttle needed for inserts.
- Client-side: stale messages are batched into groups before rendering (virtual scrolling).

---

## 8. STORAGE DESIGN

### Folder Structure

```
Storage bucket: "tribe-media" (private)

tribe-media/
├── tribes/{tribe_id}/
│   └── avatar.webp
├── profiles/{user_id}/
│   └── avatar.webp
├── messages/{group_id}/{YYYY-MM}/
│   ├── {message_id}_image.webp
│   ├── {message_id}_video.mp4
│   ├── {message_id}_audio.ogg
│   └── {message_id}_file.pdf
```

### Storage RLS (Bucket Policies)

```sql
-- Upload: only group members can upload to their group
CREATE POLICY storage_upload ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tribe-media'
    AND (
      -- Profile avatar: user's own folder
      (storage.foldername(name))[1] = 'profiles'
      AND (storage.foldername(name))[2] = auth.uid()::text
    ) OR (
      -- Message media: check group membership
      (storage.foldername(name))[1] = 'messages'
      AND is_group_member((storage.foldername(name))[2]::UUID)
    )
  );

-- Download: group members can access their group's media
CREATE POLICY storage_download ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tribe-media'
    AND (
      (storage.foldername(name))[1] = 'profiles'
      OR (
        (storage.foldername(name))[1] = 'messages'
        AND is_group_member((storage.foldername(name))[2]::UUID)
      )
      OR (
        (storage.foldername(name))[1] = 'tribes'
      )
    )
  );
```

### Signed URLs

- All media files accessed via signed URLs with 1-hour expiry.
- Client calls `supabase.storage.from('tribe-media').createSignedUrl(path, 3600)`.

### CDN

- Supabase Pro plan uses a global CDN (Cloudflare) for storage objects.
- Cache-Control headers set for static media: `public, max-age=86400, immutable` for message media (content-addressed).
- On free plan: CDN not available; consider Cloudflare in front of the storage endpoint.

### Rate Limits for Uploads

| Action | Limit |
|--------|-------|
| Image upload | 10 per minute per user |
| Video upload | 3 per minute per user |
| Max file size | Image: 10MB, Video: 50MB, Audio: 25MB, File: 25MB |

---

## 9. RATE LIMITING STRATEGY

Implemented via **Redis sliding window** in Edge Functions or middleware.

### Message Spam Prevention

```
Key:    rate:msg:{user_id}
Window: 60 seconds
Limit:  30 messages per minute (normal); 5 messages per 10s (burst)
Action: Return 429 Too Many Requests
```

### Join Limits

```
Key:    rate:join:{user_id}
Window: 3600 seconds (1 hour)
Limit:  10 tribe joins per hour
Action: Return 429
```

### Invite Abuse Protection

```
Key:    rate:invite:{user_id}
Window: 3600 seconds
Limit:  5 invite creations per hour
Action: Return 429
```

### Implementation (Edge Function)

```typescript
async function rateLimit(
  redis: Redis,
  key: string,
  windowSecs: number,
  maxRequests: number
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - (windowSecs * 1000);

  // Remove expired entries
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count current window
  const count = await redis.zcard(key);

  if (count >= maxRequests) {
    return false; // rate limited
  }

  // Add current request
  await redis.zadd(key, now, `${now}:${crypto.randomUUID()}`);
  await redis.expire(key, windowSecs);

  return true;
}
```

---

## 10. SECURITY HARDENING

### SQL Injection Prevention

- **PostgREST parameterizes all queries by default.** No raw SQL from clients.
- Edge Functions use the Supabase JS client (parameterized queries).
- Stored procedures use `plpgsql` with variable binding (no string concatenation).

### Role Validation

- All RLS policies use `auth.uid()` (Supabase JWT claim) — cannot be spoofed.
- Helper functions (`is_tribe_member`, `has_tribe_role`) marked `SECURITY DEFINER` to bypass RLS internally.
- Service role key (`service_role`) never exposed to client. Only used in server-side Edge Functions.

### Data Validation

- `CHECK` constraints on all text length fields.
- `message_type` and `group_type` are PostgreSQL enums — cannot insert invalid values.
- Client-side validation + server-side constraints = defense in depth.

### Moderation Controls

- Admin/moderator can delete any message (`messages_admin_delete` policy).
- Ban system with optional expiry (`banned_users.expires_at`).
- Banned users cannot join tribes (checked in `tribe_members_insert` policy via `is_banned()` function).
- Audit log captures all moderation actions.

### Audit Logging

- Every significant action logged to `audit_logs` table via triggers.
- Includes: `actor_id`, `action`, `target_type`, `target_id`, `metadata`, `ip_address`.
- `audit_logs` insert policy blocks direct client inserts; only `SECURITY DEFINER` triggers can write.
- Readable only by tribe owner/admin.

---

## 11. PERFORMANCE BEST PRACTICES

### N+1 Query Prevention

PostgREST supports embedded resources via `select`:
```
GET /messages?select=*,profiles!sender_id(display_name,avatar_url),message_reactions(emoji,user_id)
```
This generates a single query with JOINs, not N+1.

### Batch Fetching

- Fetch messages in batches of 50 (cursor pagination).
- Fetch group list with embedded member counts in one query.
- Fetch unread counts for all groups in a single query:
```sql
SELECT group_id, unread_count FROM message_reads WHERE user_id = auth.uid();
```

### Materialized Views

```sql
CREATE MATERIALIZED VIEW mv_group_stats AS
SELECT
  g.id AS group_id,
  g.tribe_id,
  g.name,
  g.type,
  g.member_count,
  g.message_count,
  g.last_message_at
FROM groups g
WHERE g.deleted_at IS NULL;

CREATE UNIQUE INDEX idx_mv_group_stats ON mv_group_stats (group_id);

-- Refresh every 5 minutes via pg_cron
SELECT cron.schedule('refresh-group-stats', '*/5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_group_stats;');
```

### Monitoring Metrics

| Metric | Tool |
|--------|------|
| Slow queries (>500ms) | `pg_stat_statements` |
| Table bloat | `pgstattuple` |
| Index usage | `pg_stat_user_indexes` |
| Connection count | `pg_stat_activity` |
| Cache hit ratio | `pg_stat_database` (target: >99%) |
| Dead tuples | `pg_stat_user_tables` |

---

## 12. SCALING STRATEGY

### Phase 1: Supabase Native (0–100K users)

- Single Supabase project.
- PostgREST for all CRUD.
- Supabase Realtime for WebSocket.
- Redis for rate-limiting and typing indicators.
- Read replicas ON (Supabase Pro).

### Phase 2: Service Extraction (100K–1M users)

- **Message Service**: Extract to dedicated Edge Function or standalone service with its own connection pool.
- **Media Service**: Move to a dedicated processing pipeline (image compression, video transcoding via queue + worker).
- **Notification Service**: Firebase Cloud Messaging / APNs push notifications via a queue.

```
┌─────────────┐   ┌─────────────────┐   ┌────────────┐
│ API Gateway  │───│ Message Service  │───│ PostgreSQL │
│ (Edge Fns)   │   │ (Edge Fn/Worker) │   │ (Primary)  │
└─────────────┘   └─────────────────┘   └──────┬─────┘
                  ┌─────────────────┐          │
                  │ Media Processor  │   ┌──────▼─────┐
                  │ (Queue + Worker) │   │  Read      │
                  └─────────────────┘   │  Replicas  │
                  ┌─────────────────┐   └────────────┘
                  │ Push Notifier    │
                  │ (FCM/APNs Queue) │
                  └─────────────────┘
```

### Phase 3: Event-Driven Architecture (1M+ users)

- **Event Bus**: Introduce a message queue (BullMQ/Redis Streams, or Kafka for >10M).
- Events: `message.created`, `member.joined`, `reaction.added`.
- Consumers: notification service, analytics, search indexing, moderation bot.

```
PostgreSQL ──(pg_notify)──> Event Bridge ──> Queue (Redis Streams / Kafka)
                                             ├── Push Notification Worker
                                             ├── Search Indexer (Typesense/Meilisearch)
                                             ├── Analytics Pipeline
                                             └── Moderation Bot
```

### Database Sharding Plan (10M+ users)

| Shard key | Strategy |
|-----------|----------|
| Messages | Already partitioned by `created_at`. At extreme scale, shard by `group_id` hash across multiple databases |
| Tribes | Shard by `tribe_id` range |
| Users | Shard by `user_id` range |

Intermediate step before full sharding: **Citus extension** on PostgreSQL for distributed tables.

### Read/Write Splitting

- Supabase Pro supports read replicas.
- Route all `GET` requests to read replica via PostgREST connection string parameter.
- All writes go to primary.
- Edge Functions: use `supabaseClient` with `readOnly: true` for GET endpoints.

---

## 13. HIGH-SCALE OPTIMIZATIONS

### Cursor-Based Pagination (No OFFSET)

```sql
-- Fetch next page of messages
SELECT m.*, p.display_name, p.avatar_url
FROM messages m
JOIN profiles p ON p.id = m.sender_id
WHERE m.group_id = $1
  AND m.deleted_at IS NULL
  AND m.created_at < $2  -- $2 = cursor (last message's created_at)
ORDER BY m.created_at DESC
LIMIT 50;
```

The index `(group_id, created_at DESC, id)` makes this an index-only scan. Zero OFFSET. O(1) per page regardless of total messages.

### Partitioning Strategy

- `messages` table range-partitioned by `created_at` (monthly partitions).
- PostgreSQL automatically prunes partitions during queries with `WHERE created_at > X`.
- Old partitions (>12 months) can be archived to cold storage or detached.
- New partitions created automatically via pg_cron job:

```sql
SELECT cron.schedule('create-message-partitions', '0 0 25 * *', $$
  SELECT create_next_month_partition();
$$);
```

### Write-Heavy Optimizations

- `messages` has minimal columns — no joins on write.
- Denormalized: `reaction_count` maintained via trigger (avoids `COUNT(*)` queries).
- `group.message_count` and `group.last_message_at` updated via trigger (avoids aggregate queries).
- `group.member_count` and `tribe.member_count` denormalized (avoids `COUNT(*)` on membership tables).

### Index Tuning

- **Partial indexes**: All membership/entity indexes use `WHERE deleted_at IS NULL` — smaller index, faster scans.
- **Covering indexes**: `(group_id, created_at DESC, id)` on messages covers the entire cursor pagination query.
- **No redundant indexes**: composite indexes serve multiple query patterns.
- **Monitor**: `pg_stat_user_indexes` to detect unused indexes.
