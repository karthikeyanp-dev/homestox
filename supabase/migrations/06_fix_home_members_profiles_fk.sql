-- =============================================
-- 06: Fix home_members → profiles relationship
-- =============================================
-- home_members.user_id originally referenced auth.users(id). PostgREST can
-- only embed across a declared foreign key, so the embed used by
-- memberService.getHomeMembers (`profiles:user_id (...)`) failed with
-- PGRST200 ("could not find a relationship between home_members and
-- profiles"), which made the Home Detail members list come back empty and
-- hid all owner-only controls.
--
-- Repoint the FK to profiles(id). profiles.id is itself
-- `REFERENCES auth.users(id) ON DELETE CASCADE`, so the delete-cascade chain
-- (auth user -> profile -> membership) is preserved.
--
-- Safe to run on an existing database with data.
-- =============================================

-- Backfill any membership whose user has no profile row yet, so the new
-- constraint can be validated without violations.
INSERT INTO profiles (id)
SELECT DISTINCT hm.user_id
FROM home_members hm
LEFT JOIN profiles p ON p.id = hm.user_id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Swap the foreign key target from auth.users to profiles.
ALTER TABLE home_members
    DROP CONSTRAINT IF EXISTS home_members_user_id_fkey;

ALTER TABLE home_members
    ADD CONSTRAINT home_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
