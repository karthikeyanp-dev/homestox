import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { notificationService } from '../services/notificationService';
import { profileService } from '../services/profileService';
import { supabase } from '../utils/supabase';
import { Profile } from '../types';

interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    setSession: (session: Session | null) => void;
    loadProfile: (userId: string) => Promise<void>;
    signOut: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    setSession: (session) => set({
        session,
        user: session?.user ?? null,
        isLoading: false,
    }),
    loadProfile: async (userId: string) => {
        const profile = await profileService.getProfile(userId);
        set({ profile });
    },
    signOut: async () => {
        const currentUser = get().user;

        if (currentUser) {
            await notificationService.removeCurrentDevicePushToken(currentUser.id);
        }

        await supabase.auth.signOut();
        set({ session: null, user: null, profile: null });
    },
    initialize: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        set({ session, user, isLoading: false });

        if (user) {
            get().loadProfile(user.id);
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            const nextUser = session?.user ?? null;
            set({ session, user: nextUser, isLoading: false });

            if (nextUser) {
                get().loadProfile(nextUser.id);
            } else {
                set({ profile: null });
            }
        });
    },
}));