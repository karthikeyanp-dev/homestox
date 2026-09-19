-- =============================================
-- 09: Harden client-facing authorization paths
-- =============================================
-- Clients must not be able to join arbitrary homes, alter invitation state,
-- or execute a privileged purchase for an item outside one of their homes.

-- Homes are created only through create_home_with_owner(), which atomically
-- creates the home and its owner membership.
DROP POLICY IF EXISTS "Authenticated users can create homes" ON homes;

-- Membership changes are server-side only. Acceptance is handled by the RPC
-- below after it verifies the pending invitation belongs to the caller.
DROP POLICY IF EXISTS "Users can join homes they are invited to" ON home_members;

-- Invitation records must accurately identify their sender. Responses are
-- handled by narrowly scoped RPCs rather than arbitrary table updates.
DROP POLICY IF EXISTS "Home owners can create invitations" ON home_invitations;
CREATE POLICY "Home owners can create invitations"
    ON home_invitations FOR INSERT
    WITH CHECK (
        home_id IN (SELECT get_my_owned_home_ids())
        AND invited_by = auth.uid()
    );

DROP POLICY IF EXISTS "Invitees can update their invitations" ON home_invitations;

CREATE OR REPLACE FUNCTION accept_home_invitation(invitation_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invitation home_invitations%ROWTYPE;
    caller_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    IF caller_email = '' THEN
        RAISE EXCEPTION 'A verified email address is required to accept an invitation';
    END IF;

    SELECT * INTO invitation
    FROM home_invitations
    WHERE id = invitation_uuid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;

    IF invitation.status <> 'pending' THEN
        RAISE EXCEPTION 'This invitation is no longer pending';
    END IF;

    IF lower(invitation.invited_email) <> caller_email THEN
        RAISE EXCEPTION 'This invitation was not sent to your email address';
    END IF;

    INSERT INTO home_members (home_id, user_id, role)
    VALUES (invitation.home_id, auth.uid(), 'member')
    ON CONFLICT (home_id, user_id) DO NOTHING;

    UPDATE home_invitations
    SET status = 'accepted',
        invited_user_id = auth.uid(),
        updated_at = NOW()
    WHERE id = invitation_uuid;

    RETURN invitation.home_id;
END;
$$;

CREATE OR REPLACE FUNCTION reject_home_invitation(invitation_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    UPDATE home_invitations
    SET status = 'rejected', updated_at = NOW()
    WHERE id = invitation_uuid
      AND status = 'pending'
      AND lower(invited_email) = caller_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending invitation not found';
    END IF;
END;
$$;

-- SECURITY DEFINER intentionally bypasses RLS, so validate both the claimed
-- purchaser and the item home before creating a purchase or mutating stock.
CREATE OR REPLACE FUNCTION checkout_item(
    item_uuid UUID,
    user_uuid UUID,
    price NUMERIC,
    brand TEXT,
    store_name TEXT,
    rating INTEGER,
    qty NUMERIC,
    unit TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item_home_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF user_uuid IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Purchases may only be recorded for the current user';
    END IF;

    SELECT home_id INTO item_home_id FROM items WHERE id = item_uuid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM home_members
        WHERE home_id = item_home_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You are not a member of this home';
    END IF;

    INSERT INTO purchases (item_id, purchased_by, price, brand, store_name, rating, quantity, unit)
    VALUES (item_uuid, auth.uid(), price, brand, store_name, rating, qty, unit);

    UPDATE items SET
        status = 'enough',
        current_brand = brand,
        last_store = store_name,
        last_rating = rating,
        last_purchase_date = NOW(),
        updated_at = NOW()
    WHERE id = item_uuid;
END;
$$;

REVOKE ALL ON FUNCTION create_home_with_owner(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_home_with_owner(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION accept_home_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_home_invitation(UUID) TO authenticated;
REVOKE ALL ON FUNCTION reject_home_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reject_home_invitation(UUID) TO authenticated;
REVOKE ALL ON FUNCTION checkout_item(UUID, UUID, NUMERIC, TEXT, TEXT, INTEGER, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION checkout_item(UUID, UUID, NUMERIC, TEXT, TEXT, INTEGER, NUMERIC, TEXT) TO authenticated;
