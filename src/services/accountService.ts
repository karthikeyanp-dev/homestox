import { supabase } from '../utils/supabase';

export interface DeleteAccountResult {
    homesDeleted: number;
    ownershipTransferred: number;
    /**
     * True when the account was deleted but the follow-up home cleanup did not
     * fully succeed, leaving rows that need a manual sweep. The user's account
     * is still gone, so this is not surfaced as a failure.
     */
    cleanupIncomplete: boolean;
}

/**
 * Summary of what deleting the current account would do, used to warn the user
 * before they confirm.
 */
export interface AccountDeletionImpact {
    /** Homes where the user is the only member — these are deleted outright. */
    homesToDelete: string[];
    /**
     * Shared homes where the user is the *last remaining* owner, so ownership
     * has to be handed over. A home with a co-owner is not listed here: the
     * server leaves those alone, and claiming otherwise would tell the user
     * their household is about to change hands when it is not.
     */
    homesToTransfer: string[];
}

export const accountService = {
    /**
     * Work out what will happen to the user's homes if they delete their
     * account, so the confirmation dialog can be specific rather than generic.
     *
     * This mirrors the branching in the delete-account Edge Function. It is
     * advisory only — the function re-derives everything server-side, so a
     * stale or failed preview can never cause the wrong thing to be deleted.
     */
    async getDeletionImpact(userId: string): Promise<AccountDeletionImpact> {
        const { data: memberships, error } = await supabase
            .from('home_members')
            .select('home_id, role, homes:home_id(name)')
            .eq('user_id', userId);

        if (error) throw error;

        const homesToDelete: string[] = [];
        const homesToTransfer: string[] = [];

        for (const membership of memberships ?? []) {
            const row = membership as unknown as {
                home_id: string;
                role: string;
                homes: { name: string } | { name: string }[] | null;
            };

            const home = Array.isArray(row.homes) ? row.homes[0] : row.homes;
            const homeName = home?.name ?? 'Unnamed home';

            // Fetch the survivors' roles rather than a bare count: we need to
            // know not just whether anyone remains, but whether any of them is
            // already an owner. This mirrors the Edge Function exactly.
            const { data: survivors, error: survivorsError } = await supabase
                .from('home_members')
                .select('role')
                .eq('home_id', row.home_id)
                .neq('user_id', userId);

            if (survivorsError) throw survivorsError;

            const remaining = (survivors ?? []) as Array<{ role: string }>;

            if (remaining.length === 0) {
                homesToDelete.push(homeName);
                continue;
            }

            // Only the departure of the *last* owner triggers a handover.
            if (row.role !== 'owner') continue;
            if (remaining.some((member) => member.role === 'owner')) continue;

            homesToTransfer.push(homeName);
        }

        return { homesToDelete, homesToTransfer };
    },

    /**
     * Permanently delete the signed-in user's account and all associated data.
     *
     * The Edge Function derives the target user from the access token, so
     * nothing identifying is sent in the body — a compromised client cannot
     * ask it to delete someone else.
     */
    async deleteAccount(): Promise<DeleteAccountResult> {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error('You are no longer signed in. Please sign in again and retry.');
        }

        const { data, error } = await supabase.functions.invoke('delete-account', {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });

        if (error) {
            // Supabase puts the non-2xx response on error.context rather than
            // in `data`, so without this the server's reason is lost entirely
            // and a production failure is undebuggable from device logs.
            console.error('delete-account invoke failed:', error.message);

            const context = (error as { context?: unknown }).context;
            if (context instanceof Response) {
                await context
                    .clone()
                    .text()
                    .then((body) => console.error('delete-account response body:', body))
                    .catch(() => undefined);
            }

            throw new Error(
                'We could not delete your account right now. Please check your connection and try again.'
            );
        }

        const result = data as {
            success?: boolean;
            homesDeleted?: number;
            ownershipTransferred?: number;
            cleanupIncomplete?: boolean;
        };

        if (!result?.success) {
            console.error('delete-account returned an unsuccessful payload:', data);
            throw new Error(
                'We could not delete your account right now. Please try again, or contact support if this keeps happening.'
            );
        }

        // The account is gone either way; this only signals that tidying up the
        // user's homes did not fully complete and may need a manual sweep.
        if (result.cleanupIncomplete) {
            console.error('delete-account: account deleted but home cleanup was incomplete');
        }

        return {
            homesDeleted: result.homesDeleted ?? 0,
            ownershipTransferred: result.ownershipTransferred ?? 0,
            cleanupIncomplete: result.cleanupIncomplete ?? false,
        };
    },
};
