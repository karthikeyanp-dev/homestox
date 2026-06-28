
import { supabase } from '../utils/supabase';
import { Home } from '../types';

export const homeService = {
    async createHome(name: string, _userId: string) {
        // Uses a SECURITY DEFINER RPC to create the home and add the owner
        // atomically, avoiding a false RLS violation caused by PostgREST checking
        // the SELECT policy on RETURNING before the user is in home_members.
        const { data: home, error } = await supabase
            .rpc('create_home_with_owner', { home_name: name });

        if (error) throw error;
        return home as Home;
    },

    async getUserHomes(userId: string) {
        const { data, error } = await supabase
            .from('home_members')
            .select('homes(*)')
            .eq('user_id', userId);

        if (error) throw error;
        return data.map((d: any) => d.homes) as Home[];
    },

    async updateHome(homeId: string, name: string) {
        const { data, error } = await supabase
            .from('homes')
            .update({ name })
            .eq('id', homeId)
            .select()
            .single();

        if (error) throw error;
        return data as Home;
    },

    async deleteHome(homeId: string) {
        const { error } = await supabase
            .from('homes')
            .delete()
            .eq('id', homeId);

        if (error) throw error;
    }
};
