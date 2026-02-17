-- ============================================================================
-- Founder Match Service — Analytics RPC + Abnormal Unmatch Logic
-- ============================================================================
-- Version: 002_analytics_unmatch_logic
-- ============================================================================

-- 1. Analytics summary RPC
CREATE OR REPLACE FUNCTION founder_match_analytics_summary()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_swipes_today INTEGER;
  v_matches_today INTEGER;
  v_conversations_started_today INTEGER;
  v_first_messages_today INTEGER;
  v_swipes_total INTEGER;
  v_matches_total INTEGER;
  v_retention_events_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_swipes_today
  FROM analytics_logs
  WHERE event_type = 'swipe'
    AND event_time >= date_trunc('day', NOW());

  SELECT COUNT(*) INTO v_matches_today
  FROM analytics_logs
  WHERE event_type = 'match_created'
    AND event_time >= date_trunc('day', NOW());

  SELECT COUNT(*) INTO v_conversations_started_today
  FROM analytics_logs
  WHERE event_type = 'conversation_started'
    AND event_time >= date_trunc('day', NOW());

  SELECT COUNT(*) INTO v_first_messages_today
  FROM analytics_logs
  WHERE event_type = 'first_message_sent'
    AND event_time >= date_trunc('day', NOW());

  SELECT COUNT(*) INTO v_swipes_total
  FROM analytics_logs
  WHERE event_type = 'swipe';

  SELECT COUNT(*) INTO v_matches_total
  FROM analytics_logs
  WHERE event_type = 'match_created';

  SELECT COUNT(*) INTO v_retention_events_total
  FROM analytics_logs
  WHERE event_type = 'retention_after_match';

  RETURN jsonb_build_object(
    'today', jsonb_build_object(
      'swipes', v_swipes_today,
      'matches', v_matches_today,
      'conversations_started', v_conversations_started_today,
      'first_messages', v_first_messages_today
    ),
    'totals', jsonb_build_object(
      'swipes', v_swipes_total,
      'matches', v_matches_total,
      'retention_events', v_retention_events_total
    )
  );
END;
$$;


-- 2. Abnormal unmatch detection helper
CREATE OR REPLACE FUNCTION flag_abnormal_unmatches_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INTEGER;
  v_unmatched_by_user INTEGER;
  v_ratio NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM user_matches
  WHERE (user1_id = p_user_id OR user2_id = p_user_id);

  IF v_total = 0 THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_unmatched_by_user
  FROM user_matches
  WHERE status = 'unmatched'
    AND unmatched_by = p_user_id;

  v_ratio := (v_unmatched_by_user::NUMERIC / v_total::NUMERIC) * 100;

  IF v_ratio >= 50 THEN
    UPDATE founder_profiles
    SET abnormal_unmatch_flag = TRUE
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- Trigger wrapper for user_matches updates
CREATE OR REPLACE FUNCTION trg_user_matches_after_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'unmatched' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.unmatched_by IS NOT NULL THEN
      PERFORM flag_abnormal_unmatches_for_user(NEW.unmatched_by);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_matches_unmatch_flag ON user_matches;

CREATE TRIGGER trg_user_matches_unmatch_flag
AFTER UPDATE OF status ON user_matches
FOR EACH ROW
EXECUTE FUNCTION trg_user_matches_after_update();

