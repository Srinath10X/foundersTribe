-- ============================================================================
-- 3. FIX: Add missing foreign keys to tribe_messages
-- ============================================================================

-- The initial schema missed the foreign key constraints on the partitioned table.
-- We need to add them so PostgREST can detect the relationships for joins.

BEGIN;

ALTER TABLE tribe_messages
  ADD CONSTRAINT tribe_messages_sender_id_fkey 
  FOREIGN KEY (sender_id) 
  REFERENCES profiles(id);

ALTER TABLE tribe_messages
  ADD CONSTRAINT tribe_messages_group_id_fkey 
  FOREIGN KEY (group_id) 
  REFERENCES groups(id) 
  ON DELETE CASCADE;

COMMIT;
