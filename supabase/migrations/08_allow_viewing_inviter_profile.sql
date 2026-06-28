-- =============================================
-- 08: Allow viewing inviter profile on invitations
-- =============================================
-- When a user fetches their own pending invitations via
-- getUserPendingInvitations, the embed
--     inviter_profile:invited_by (id, email, full_name, avatar_url)
-- joins into `profiles`. The "Users can view relevant profiles"
-- policy on `profiles` only grants access to:
--   (a) the user's own row, and
--   (b) profiles of people in homes the user already belongs to.
-- The inviter is the owner of the *inviting* home, which the
-- invitee does not yet belong to, so the embedded join comes
-- back null and the UI falls back to "Someone".
--
-- Fix: add a SECURITY DEFINER helper that returns the
-- `invited_by` profile IDs of every invitation the caller
-- can already see (per the existing home_invitations SELECT
-- policy), and add a SELECT policy on `profiles` that allows
-- reading those rows. SECURITY DEFINER is used so the helper
-- itself is not blocked by the same RLS recursion we are
-- trying to avoid.
-- =============================================

-- Helper: profile IDs of inviters for invitations the caller can see
CREATE OR REPLACE FUNCTION get_my_visible_inviter_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT DISTINCT invited_by
    FROM home_invitations
    WHERE
        invited_email IN (SELECT email FROM profiles WHERE id = auth.uid())
        OR invited_by = auth.uid()
        OR home_id IN (SELECT get_my_owned_home_ids());
$$;

-- Allow reading inviter profiles tied to invitations the caller can see
DROP POLICY IF EXISTS "Users can view inviter profiles" ON profiles;
CREATE POLICY "Users can view inviter profiles"
    ON profiles FOR SELECT
    USING (id IN (SELECT get_my_visible_inviter_ids()));
