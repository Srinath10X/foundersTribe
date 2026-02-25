-- 006_feed_posts.sql
-- Feed posts, likes, and comments for the professional work-showcase feed

-- Post type enum
DO $$ BEGIN
  CREATE TYPE post_type_enum AS ENUM ('work_update', 'showcase', 'milestone', 'hiring', 'insight');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Feed posts
CREATE TABLE IF NOT EXISTS feed_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content       text NOT NULL,
  post_type     post_type_enum NOT NULL DEFAULT 'work_update',
  images        jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags          jsonb NOT NULL DEFAULT '[]'::jsonb,
  likes_count   integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Feed post likes (unique per user per post)
CREATE TABLE IF NOT EXISTS feed_post_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- Feed post comments
CREATE TABLE IF NOT EXISTS feed_post_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_author       ON feed_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created       ON feed_posts (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type          ON feed_posts (post_type);
CREATE INDEX IF NOT EXISTS idx_feed_post_likes_post     ON feed_post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_feed_post_likes_user     ON feed_post_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_feed_post_comments_post  ON feed_post_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_feed_post_comments_user  ON feed_post_comments (user_id);

-- updated_at trigger for feed_posts
CREATE OR REPLACE FUNCTION update_feed_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feed_posts_updated_at ON feed_posts;
CREATE TRIGGER trg_feed_posts_updated_at
  BEFORE UPDATE ON feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_feed_posts_updated_at();

-- updated_at trigger for feed_post_comments
CREATE OR REPLACE FUNCTION update_feed_post_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feed_post_comments_updated_at ON feed_post_comments;
CREATE TRIGGER trg_feed_post_comments_updated_at
  BEFORE UPDATE ON feed_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_feed_post_comments_updated_at();

-- Auto-increment / decrement likes_count on feed_posts
CREATE OR REPLACE FUNCTION update_feed_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feed_post_likes_count ON feed_post_likes;
CREATE TRIGGER trg_feed_post_likes_count
  AFTER INSERT OR DELETE ON feed_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_feed_post_likes_count();

-- Auto-increment / decrement comments_count on feed_posts
CREATE OR REPLACE FUNCTION update_feed_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feed_post_comments_count ON feed_post_comments;
CREATE TRIGGER trg_feed_post_comments_count
  AFTER INSERT OR DELETE ON feed_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_feed_post_comments_count();

-- RLS policies
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can read feed posts
CREATE POLICY feed_posts_select ON feed_posts FOR SELECT USING (true);
-- Authors can insert their own posts
CREATE POLICY feed_posts_insert ON feed_posts FOR INSERT WITH CHECK (author_id = auth.uid());
-- Authors can update their own posts
CREATE POLICY feed_posts_update ON feed_posts FOR UPDATE USING (author_id = auth.uid());
-- Authors can delete their own posts
CREATE POLICY feed_posts_delete ON feed_posts FOR DELETE USING (author_id = auth.uid());

-- Everyone can read likes
CREATE POLICY feed_post_likes_select ON feed_post_likes FOR SELECT USING (true);
-- Users can like (insert their own)
CREATE POLICY feed_post_likes_insert ON feed_post_likes FOR INSERT WITH CHECK (user_id = auth.uid());
-- Users can unlike (delete their own)
CREATE POLICY feed_post_likes_delete ON feed_post_likes FOR DELETE USING (user_id = auth.uid());

-- Everyone can read comments
CREATE POLICY feed_post_comments_select ON feed_post_comments FOR SELECT USING (true);
-- Users can comment (insert their own)
CREATE POLICY feed_post_comments_insert ON feed_post_comments FOR INSERT WITH CHECK (user_id = auth.uid());
-- Users can update their own comments
CREATE POLICY feed_post_comments_update ON feed_post_comments FOR UPDATE USING (user_id = auth.uid());
-- Users can delete their own comments
CREATE POLICY feed_post_comments_delete ON feed_post_comments FOR DELETE USING (user_id = auth.uid());
