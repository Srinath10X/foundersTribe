CREATE OR REPLACE FUNCTION is_match_participant(p_match_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_matches
    WHERE id = p_match_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipe_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_profiles_select ON founder_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY founder_profiles_insert_self ON founder_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY founder_profiles_update_self ON founder_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY skill_catalog_select ON skill_catalog
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY user_skill_links_select ON user_skill_links
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_skill_links_modify_self ON user_skill_links
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_blocks_select ON user_blocks
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

CREATE POLICY user_blocks_insert ON user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY user_blocks_delete ON user_blocks
  FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY user_reports_select ON user_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY user_reports_insert ON user_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY swipe_actions_select ON swipe_actions
  FOR SELECT TO authenticated
  USING (swiper_id = auth.uid() OR target_id = auth.uid());

CREATE POLICY swipe_actions_insert ON swipe_actions
  FOR INSERT TO authenticated
  WITH CHECK (swiper_id = auth.uid());

CREATE POLICY user_matches_select ON user_matches
  FOR SELECT TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY chat_messages_select ON chat_messages
  FOR SELECT TO authenticated
  USING (is_match_participant(match_id));

CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND is_match_participant(match_id));

CREATE POLICY user_notifications_select ON user_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY analytics_logs_no_client_select ON analytics_logs
  FOR SELECT TO authenticated
  USING (false);

CREATE POLICY analytics_logs_no_client_insert ON analytics_logs
  FOR INSERT TO authenticated
  WITH CHECK (false);

ALTER FUNCTION founder_match_analytics_summary() SECURITY DEFINER;

