-- =============================================
-- 02: Row Level Security (RLS)
-- =============================================
-- Enables RLS on all core tables and creates
-- SECURITY DEFINER helper functions to prevent
-- infinite recursion in policies.
-- =============================================

-- =============================================
-- SECURITY DEFINER Helper Functions
-- =============================================
-- These bypass RLS when reading home_members,
-- preventing infinite recursion in policies.

-- Returns all home_ids the current user belongs to
CREATE OR REPLACE FUNCTION get_my_home_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT home_id FROM home_members WHERE user_id = auth.uid();
$$;

-- Returns home_ids where current user is the owner
CREATE OR REPLACE FUNCTION get_my_owned_home_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT home_id FROM home_members WHERE user_id = auth.uid() AND role = 'owner';
$$;

-- =============================================
-- HOMES
-- =============================================
ALTER TABLE homes ENABLE ROW LEVEL SECURITY;

-- Members can view their homes
CREATE POLICY "Home members can view their homes"
    ON homes FOR SELECT
    USING (id IN (SELECT get_my_home_ids()));

-- Any authenticated user can create a home
CREATE POLICY "Authenticated users can create homes"
    ON homes FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Only the owner can update the home
CREATE POLICY "Home owners can update their homes"
    ON homes FOR UPDATE
    USING (id IN (SELECT get_my_owned_home_ids()));

-- Only the owner can delete the home
CREATE POLICY "Home owners can delete their homes"
    ON homes FOR DELETE
    USING (id IN (SELECT get_my_owned_home_ids()));

-- =============================================
-- HOME_MEMBERS
-- =============================================
ALTER TABLE home_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members of the same home
CREATE POLICY "Home members can view members"
    ON home_members FOR SELECT
    USING (home_id IN (SELECT get_my_home_ids()));

-- Users can insert their own membership row
CREATE POLICY "Users can join homes they are invited to"
    ON home_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Owner can remove anyone; members can remove themselves
CREATE POLICY "Home owners can remove members"
    ON home_members FOR DELETE
    USING (
        home_id IN (SELECT get_my_owned_home_ids())
        OR user_id = auth.uid()
    );

-- Only owners can change roles
CREATE POLICY "Home owners can update member roles"
    ON home_members FOR UPDATE
    USING (home_id IN (SELECT get_my_owned_home_ids()));

-- =============================================
-- ITEMS
-- =============================================
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Home members can view items"
    ON items FOR SELECT
    USING (home_id IN (SELECT get_my_home_ids()));

CREATE POLICY "Home members can insert items"
    ON items FOR INSERT
    WITH CHECK (home_id IN (SELECT get_my_home_ids()));

CREATE POLICY "Home members can update items"
    ON items FOR UPDATE
    USING (home_id IN (SELECT get_my_home_ids()));

CREATE POLICY "Home members can delete items"
    ON items FOR DELETE
    USING (home_id IN (SELECT get_my_home_ids()));

-- =============================================
-- PROFILES
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile + profiles of people in shared homes
CREATE POLICY "Users can view relevant profiles"
    ON profiles FOR SELECT
    USING (
        id = auth.uid()
        OR id IN (
            SELECT user_id FROM home_members
            WHERE home_id IN (SELECT get_my_home_ids())
        )
    );

-- Users can only insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- =============================================
-- PURCHASES
-- =============================================
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Home members can view purchases for items in their homes
CREATE POLICY "Home members can view purchases"
    ON purchases FOR SELECT
    USING (
        item_id IN (SELECT id FROM items WHERE home_id IN (SELECT get_my_home_ids()))
    );

-- Home members can create purchases for items in their homes
CREATE POLICY "Home members can insert purchases"
    ON purchases FOR INSERT
    WITH CHECK (
        item_id IN (SELECT id FROM items WHERE home_id IN (SELECT get_my_home_ids()))
    );

-- Home members can update purchases (mainly for ratings)
CREATE POLICY "Home members can update purchases"
    ON purchases FOR UPDATE
    USING (
        item_id IN (SELECT id FROM items WHERE home_id IN (SELECT get_my_home_ids()))
    )
    WITH CHECK (
        item_id IN (SELECT id FROM items WHERE home_id IN (SELECT get_my_home_ids()))
    );

-- Home members can delete purchases in their homes
CREATE POLICY "Home members can delete purchases"
    ON purchases FOR DELETE
    USING (
        item_id IN (SELECT id FROM items WHERE home_id IN (SELECT get_my_home_ids()))
    );
