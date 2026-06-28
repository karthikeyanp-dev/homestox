-- =============================================
-- 01: Core Tables
-- =============================================
-- Creates all base tables with proper CASCADE foreign keys
-- and indexes. RLS is enabled in a separate migration.
-- =============================================

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HOMES
-- =============================================
CREATE TABLE IF NOT EXISTS homes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HOME_MEMBERS
-- =============================================
CREATE TABLE IF NOT EXISTS home_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    -- References profiles(id) (not auth.users) so PostgREST can embed the
    -- member's profile (getHomeMembers selects `profiles:user_id`). profiles.id
    -- itself cascades from auth.users(id), so the delete chain is preserved.
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(home_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_home_members_home_id ON home_members(home_id);
CREATE INDEX IF NOT EXISTS idx_home_members_user_id ON home_members(user_id);

-- =============================================
-- ITEMS (inventory items for a home)
-- =============================================
CREATE TABLE IF NOT EXISTS items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    status TEXT NOT NULL DEFAULT 'enough' CHECK (status IN ('enough', 'nearing', 'finished')),
    quantity NUMERIC,
    unit TEXT,
    min_quantity NUMERIC DEFAULT 1,
    price NUMERIC,
    last_purchase_date TIMESTAMPTZ,
    notes TEXT,
    image_url TEXT,
    current_brand TEXT,
    last_store TEXT,
    last_rating INTEGER,
    not_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_home_id ON items(home_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);

-- =============================================
-- PURCHASES (price history for items)
-- =============================================
CREATE TABLE IF NOT EXISTS purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    purchased_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    price NUMERIC NOT NULL,
    brand TEXT,
    store_name TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_item_id ON purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchased_at ON purchases(purchased_at DESC);
