import { supabase } from '../utils/supabase';
import { getDisplayName } from '../utils/profileDisplay';
import { Profile } from '../types';

export const profileService = {
    /**
     * Fetch a profile by user id.
     */
    async getProfile(userId: string): Promise<Profile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return data as Profile;
    },

    /**
     * Fetch the display name for a user id.
     */
    async getDisplayName(userId: string): Promise<string> {
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single();

        if (error || !data) return 'Someone';
        return getDisplayName(data as Profile, 'Someone');
    },

    /**
     * Update the current user's profile.
     *
     * Also mirrors the change into auth user_metadata so the
     * auth.users -> profiles sync trigger (which copies full_name from
     * raw_user_meta_data) cannot later revert an edited value back to the
     * original signup name on a subsequent auth.users update.
     */
    async updateProfile(userId: string, updates: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>): Promise<Profile> {
        const { data, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select('id, email, full_name, avatar_url')
            .single();

        if (error) throw error;

        if (updates.full_name !== undefined) {
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: updates.full_name },
            });
            // Non-fatal: the profiles row is the source of truth for display.
            if (authError) console.error('Error syncing full_name to auth metadata:', authError);
        }

        return data as Profile;
    },
};
