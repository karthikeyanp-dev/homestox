-- =============================================
-- 05: Functions & Triggers
-- =============================================
-- Utility functions for home creation, item
-- seeding, auto-seed trigger, and checkout.
-- =============================================

-- =============================================
-- create_home_with_owner (RPC)
-- =============================================
-- Atomically creates a home and adds the caller
-- as the owner. SECURITY DEFINER bypasses RLS
-- for internal inserts, preventing the RLS
-- "RETURNING clause" race condition.
-- =============================================
CREATE OR REPLACE FUNCTION create_home_with_owner(home_name TEXT)
RETURNS homes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_home homes;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Ensure profile row exists
    INSERT INTO profiles (id) VALUES (auth.uid()) ON CONFLICT (id) DO NOTHING;

    -- Create the home
    INSERT INTO homes (name) VALUES (home_name) RETURNING * INTO new_home;

    -- Add creator as owner
    INSERT INTO home_members (home_id, user_id, role)
    VALUES (new_home.id, auth.uid(), 'owner');

    RETURN new_home;
END;
$$;

-- =============================================
-- seed_home_items (5 starter items)
-- =============================================
-- Inserts a minimal set of starter items when
-- a new home is created. Users can freely add,
-- modify, or delete items from there.
-- =============================================
CREATE OR REPLACE FUNCTION seed_home_items(target_home_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO items (home_id, name, category, status) VALUES
        (target_home_id, 'Onion',           'Vegetables',           'enough'),
        (target_home_id, 'Rice',            'Staples & Condiments', 'enough'),
        (target_home_id, 'Banana',          'Fruits',               'enough'),
        (target_home_id, 'Milk',            'Dairy & Eggs',         'enough'),
        (target_home_id, 'Turmeric Powder', 'Spices & Masalas',     'enough');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Auto-seed Trigger
-- =============================================
-- Fires after a new home is inserted, calling
-- seed_home_items with the new home's ID.
-- =============================================
CREATE OR REPLACE FUNCTION auto_seed_home_items()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM seed_home_items(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_home_created_seed_items ON homes;
CREATE TRIGGER on_home_created_seed_items
    AFTER INSERT ON homes
    FOR EACH ROW
    EXECUTE FUNCTION auto_seed_home_items();

-- =============================================
-- checkout_item (RPC)
-- =============================================
-- Records a purchase and updates the item's
-- status, brand, store, rating, and last
-- purchase date. SECURITY DEFINER bypasses RLS
-- so the function can write to both tables
-- atomically.
-- =============================================
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
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Record the purchase
    INSERT INTO purchases (item_id, purchased_by, price, brand, store_name, rating, quantity, unit)
    VALUES (item_uuid, user_uuid, price, brand, store_name, rating, qty, unit);

    -- Update the item: mark as stocked, store brand/store/rating info
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
