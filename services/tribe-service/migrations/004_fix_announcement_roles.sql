-- ============================================================================
-- 4. FIX: Announcement Group Roles
-- ============================================================================

-- Problem: The original trigger assigned 'member' role to everyone in announcement groups.
-- Fix: Assign 'admin' role in the group if the user is 'owner' or 'admin' in the tribe.

CREATE OR REPLACE FUNCTION fn_tribe_member_after_insert()
RETURNS TRIGGER AS $$
DECLARE 
  v_ann_group UUID;
  v_group_role group_role;
BEGIN
  -- Determine group role based on tribe role
  IF NEW.role IN ('owner', 'admin') THEN
    v_group_role := 'admin';
  ELSE
    v_group_role := 'member';
  END IF;

  SELECT id INTO v_ann_group FROM groups
  WHERE tribe_id = NEW.tribe_id AND type = 'announcement' AND deleted_at IS NULL LIMIT 1;

  IF v_ann_group IS NOT NULL THEN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_ann_group, NEW.user_id, v_group_role)
    ON CONFLICT (group_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role; -- Update role if exists
    
    UPDATE groups SET member_count = member_count + 1 WHERE id = v_ann_group;
  END IF;

  UPDATE tribes SET member_count = member_count + 1 WHERE id = NEW.tribe_id;

  INSERT INTO audit_logs (tribe_id, actor_id, action, target_type, target_id)
  VALUES (NEW.tribe_id, NEW.user_id, 'member_joined', 'user', NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: Fix existing announcement group members
-- Set role to 'admin' for anyone who is 'owner' or 'admin' in the tribe
UPDATE group_members gm
SET role = 'admin'
FROM groups g, tribe_members tm
WHERE gm.group_id = g.id
  AND g.type = 'announcement'
  AND g.tribe_id = tm.tribe_id
  AND tm.user_id = gm.user_id
  AND tm.role IN ('owner', 'admin')
  AND gm.role = 'member';
