-- =============================================
-- 00: RESET (DESTRUCTIVE)
-- =============================================
-- Drops every object created by migrations 01-05 so the
-- schema can be rebuilt from scratch. This DELETES ALL DATA
-- in these tables. It does NOT touch auth.users (your accounts).
--
-- Run this ONLY when you intend to wipe the app schema.
-- =============================================

-- Triggers (must be dropped before their functions / tables)
DROP TRIGGER IF EXISTS on_auth_user_created_sync_email ON auth.users;
DROP TRIGGER IF EXISTS on_home_created_seed_items ON homes;

-- Tables (CASCADE removes policies, indexes, and FKs automatically).
-- Order doesn't matter with CASCADE, but listed leaf-first for clarity.
DROP TABLE IF EXISTS notifications     CASCADE;
DROP TABLE IF EXISTS push_tokens       CASCADE;
DROP TABLE IF EXISTS home_invitations  CASCADE;
DROP TABLE IF EXISTS purchases         CASCADE;
DROP TABLE IF EXISTS items             CASCADE;
DROP TABLE IF EXISTS home_members      CASCADE;
DROP TABLE IF EXISTS homes             CASCADE;
DROP TABLE IF EXISTS profiles          CASCADE;

-- Functions
DROP FUNCTION IF EXISTS create_home_with_owner(TEXT);
DROP FUNCTION IF EXISTS checkout_item(UUID, UUID, NUMERIC, TEXT, TEXT, INTEGER, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS seed_home_items(UUID);
DROP FUNCTION IF EXISTS auto_seed_home_items();
DROP FUNCTION IF EXISTS cleanup_old_notifications();
DROP FUNCTION IF EXISTS sync_profile_email();
DROP FUNCTION IF EXISTS get_my_home_ids();
DROP FUNCTION IF EXISTS get_my_owned_home_ids();
