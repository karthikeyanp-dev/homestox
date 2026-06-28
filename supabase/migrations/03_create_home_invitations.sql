-- =============================================
-- 03: Home Invitations
-- =============================================
-- Creates the invitations table, RLS policies,
-- and the auth.users email sync trigger.
-- =============================================

-- =============================================
-- TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS home_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES profiles(id),
    invited_user_id UUID REFERENCES profiles(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_home_invitations_home_id ON home_invitations(home_id);
CREATE INDEX IF NOT EXISTS idx_home_invitations_email_status ON home_invitations(invited_email, status);
CREATE INDEX IF NOT EXISTS idx_home_invitations_user_status ON home_invitations(invited_user_id, status);

-- Prevent duplicate pending invitations for same email + home
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invite
    ON home_invitations(home_id, invited_email)
    WHERE status = 'pending';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE home_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view invitations sent to them, sent by them, or for homes they own
CREATE POLICY "Users can view their own invitations"
    ON home_invitations FOR SELECT
    USING (
        invited_email IN (
            SELECT email FROM profiles WHERE id = auth.uid()
        )
        OR invited_by = auth.uid()
        OR home_id IN (SELECT get_my_owned_home_ids())
    );

-- INSERT: Home owners can create invitations
CREATE POLICY "Home owners can create invitations"
    ON home_invitations FOR INSERT
    WITH CHECK (
        home_id IN (SELECT get_my_owned_home_ids())
    );

-- UPDATE: Invitees can accept/reject their own invitations
CREATE POLICY "Invitees can update their invitations"
    ON home_invitations FOR UPDATE
    USING (
        invited_email IN (
            SELECT email FROM profiles WHERE id = auth.uid()
        )
    );

-- DELETE: Home owners can cancel invitations
CREATE POLICY "Home owners can delete invitations"
    ON home_invitations FOR DELETE
    USING (
        home_id IN (SELECT get_my_owned_home_ids())
    );

-- =============================================
-- EMAIL SYNC TRIGGER
-- =============================================
-- Auto-sync email from auth.users to profiles table.
-- This is needed because auth.users.email is not
-- accessible inside RLS policies.

CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO UPDATE SET email = NEW.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_sync_email ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_email
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_email();
