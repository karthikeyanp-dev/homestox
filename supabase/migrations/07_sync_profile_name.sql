-- =============================================
-- 07: Sync Full Name from Auth Metadata
-- =============================================
-- Extends the auth.users -> profiles sync trigger
-- to also copy full_name from raw_user_meta_data.
-- This lets us collect the user's name during signup
-- via Supabase Auth user_metadata and have it land in
-- the profiles table automatically, even when email
-- confirmation is enabled.
-- =============================================

CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'full_name'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and uses the updated function.
-- Migration 03 also creates this trigger; the DROP/CREATE here makes
-- migration 07 self-contained and idempotent for environments that may
-- apply it independently.
DROP TRIGGER IF EXISTS on_auth_user_created_sync_email ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_email
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_email();
