import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { accountService, DeleteAccountResult } from '../services/accountService';
import { notificationService } from '../services/notificationService';
import { profileService } from '../services/profileService';
import { queryClient } from '../utils/queryClient';
import { supabase } from '../utils/supabase';
import { useHomeStore } from './useHomeStore';
import { Profile } from '../types';

interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    setSession: (session: Session | null) => void;
    loadProfile: (userId: string) => Promise<void>;
    signOut: () => Promise<void>;
    deleteAccount: () => Promise<DeleteAccountResult>;
    initialize: () => Promise<void>;
}

/**
 * Drop every trace of the outgoing session from this device: the cached query
 * data, the persisted home selection, and the in-memory auth state.
 *
 * Shared by sign-out and account deletion so the two can never drift apart.
 */
function clearLocalSessionState(set: (partial: Partial<AuthState>) => void) {
    queryClient.clear();
    useHomeStore.getState().reset();
    set({ session: null, user: null, profile: null });
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
        clearLocalSessionState(set);
    },
    deleteAccount: async () => {
        const currentUser = get().user;

        if (!currentUser) {
            throw new Error('You are no longer signed in. Please sign in again and retry.');
        }

        // Throws on failure, which leaves the session intact so the user can
        // retry rather than being stranded in a signed-out-but-not-deleted state.
        //
        // Deliberately no push-token cleanup before this point. NotificationProvider
        // only re-registers when `user` changes, so clearing the token up front
        // would leave a user whose deletion failed signed in with push silently
        // dead until the next app launch. push_tokens cascades from auth.users,
        // so a successful delete removes the row server-side regardless.
        const result = await accountService.deleteAccount();

        // Account is gone; drop the locally cached token so a future sign-in on
        // this device registers a fresh one instead of reusing a dead handle.
        await notificationService
            .clearStoredPushToken()
            .catch(() => undefined);

        // The user no longer exists, so this call will fail server-side. Run it
        // anyway to clear the locally persisted session, and ignore the error.
        await supabase.auth.signOut().catch(() => undefined);
        clearLocalSessionState(set);

        return result;
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