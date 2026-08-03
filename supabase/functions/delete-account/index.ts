import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * delete-account
 *
 * Permanently deletes the calling user's account and all data associated with
 * it. Required by Google Play's User Data policy for any app that lets users
 * create an account (https://support.google.com/googleplay/android-developer/answer/13327111).
 *
 * The caller is identified solely from the JWT — there is no user id in the
 * request body — so this endpoint can only ever delete the account that made
 * the call.
 *
 * ## Ordering and partial failure
 *
 * These steps span several statements and cannot be made atomic from here:
 * auth.admin.deleteUser goes through GoTrue, not the SQL connection, so no
 * transaction can wrap both it and the home cleanup. Given that, the order is
 * chosen so the *unrecoverable* work happens last:
 *
 *   1. PLAN. Resolve memberships and decide what happens to each home. Read
 *      only — nothing has changed yet. Must happen before the user is deleted,
 *      because the cascade wipes the home_members rows this depends on.
 *   2. DELETE THE USER. The step most likely to fail, and the one the user
 *      actually asked for. If it fails, nothing destructive has happened and
 *      the caller can safely retry.
 *   3. EXECUTE. Delete now-empty homes and hand over ownership. If this fails
 *      we are left with orphaned or ownerless rows — untidy, but recoverable
 *      by a support sweep, and the account is already gone.
 *
 * Doing it the other way round (homes first, user last) would mean a failed
 * deleteUser could leave a still-active user whose sole home had already been
 * permanently deleted — irreversible data loss for someone who is still using
 * the app. Orphan rows are strictly the better failure mode.
 *
 * Step 3 re-verifies its preconditions rather than blindly trusting the plan,
 * so a member who joins between steps 1 and 3 cannot have their home deleted
 * out from under them.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface MembershipRow {
  home_id: string;
  role: string;
}

interface SurvivorRow {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
}

/**
 * What step 3 will do, decided entirely from pre-deletion reads.
 *
 * Only home ids are recorded, not the chosen heir. The heir is re-resolved at
 * execute time: a member row captured during planning may be gone by then, and
 * acting on a stale row id would silently promote nobody.
 */
interface CleanupPlan {
  homesToDelete: string[];
  homesNeedingOwner: string[];
}

type EnsureOwnerOutcome = 'already-owned' | 'promoted' | 'empty' | 'failed';

/**
 * Guarantee that a home has at least one owner, promoting the longest-tenured
 * member if it does not.
 *
 * Used for both cleanup paths because they converge on the same requirement:
 * RLS gates every management action on role = 'owner', so a home with members
 * but no owner cannot be renamed, deleted, or have its membership changed by
 * anyone. That is a worse outcome than the orphan rows we already tolerate.
 *
 * The UPDATE is followed by a select so a zero-row match is detected —
 * PostgREST reports no error when an update matches nothing, so without this
 * a vanished heir would look like a successful handover.
 */
async function ensureHomeHasOwner(
  client: ReturnType<typeof createClient>,
  homeId: string
): Promise<EnsureOwnerOutcome> {
  const { data: members, error } = await client
    .from('home_members')
    .select('id, user_id, role, joined_at')
    .eq('home_id', homeId);

  if (error) {
    console.error(`delete-account: cleanup: could not load members of home ${homeId}:`, error.message);
    return 'failed';
  }

  const remaining = (members ?? []) as SurvivorRow[];

  if (remaining.length === 0) return 'empty';
  if (remaining.some((member) => member.role === 'owner')) return 'already-owned';

  // Rows with a null joined_at sort last so a member with a known join date is
  // always preferred.
  const heir = [...remaining].sort((a, b) => {
    const aTime = a.joined_at ? Date.parse(a.joined_at) : Number.POSITIVE_INFINITY;
    const bTime = b.joined_at ? Date.parse(b.joined_at) : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  })[0];

  const { data: promoted, error: promoteError } = await client
    .from('home_members')
    .update({ role: 'owner' })
    .eq('id', heir.id)
    .select('id');

  if (promoteError) {
    console.error(
      `delete-account: cleanup: failed to promote ${heir.user_id} in home ${homeId}:`,
      promoteError.message
    );
    return 'failed';
  }

  if (!promoted || promoted.length === 0) {
    console.error(
      `delete-account: cleanup: promotion of ${heir.user_id} in home ${homeId} matched no rows`
    );
    return 'failed';
  }

  return 'promoted';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Missing required configuration' }, 500);
    }

    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await serviceClient.auth.getUser(token);

    if (authError || !user) {
      console.error('delete-account: auth.getUser failed:', authError?.message ?? 'no user returned');
      return json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.id;

    // ---- 1. PLAN (read-only) ---------------------------------------------
    const { data: memberships, error: membershipsError } = await serviceClient
      .from('home_members')
      .select('home_id, role')
      .eq('user_id', userId);

    if (membershipsError) {
      console.error('delete-account: failed to load memberships:', membershipsError.message);
      return json({ error: 'Failed to load account data' }, 500);
    }

    const plan: CleanupPlan = { homesToDelete: [], homesNeedingOwner: [] };

    for (const membership of (memberships ?? []) as MembershipRow[]) {
      const { data: survivors, error: survivorsError } = await serviceClient
        .from('home_members')
        .select('id, user_id, role, joined_at')
        .eq('home_id', membership.home_id)
        .neq('user_id', userId);

      if (survivorsError) {
        console.error(
          `delete-account: failed to load members of home ${membership.home_id}:`,
          survivorsError.message
        );
        return json({ error: 'Failed to load account data' }, 500);
      }

      const remaining = (survivors ?? []) as SurvivorRow[];

      // Sole member: the home dies with the account. Leaving it behind would
      // strand rows that no surviving RLS policy can reach — invisible to
      // everyone, yet occupying the table forever.
      if (remaining.length === 0) {
        plan.homesToDelete.push(membership.home_id);
        continue;
      }

      // Shared home: only the departure of the last owner needs a handover.
      // RLS gates home rename/delete, member removal and role changes on
      // role = 'owner', so an ownerless home leaves survivors unable to
      // manage it.
      if (membership.role !== 'owner') continue;
      if (remaining.some((member) => member.role === 'owner')) continue;

      plan.homesNeedingOwner.push(membership.home_id);
    }

    // ---- 2. DELETE THE USER ----------------------------------------------
    // Nothing destructive has happened yet, so a failure here is safely
    // retryable by the client.
    const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('delete-account: auth.admin.deleteUser failed:', deleteUserError.message);
      return json({ error: 'Failed to delete account' }, 500);
    }

    // ---- 3. EXECUTE THE PLAN ---------------------------------------------
    // The account is gone from here on. Cleanup failures are logged and
    // reported, but never turned into an error response: the user asked to be
    // deleted and they have been, and telling them it failed would invite a
    // pointless retry against an account that no longer exists.
    let cleanupIncomplete = false;
    let homesDeleted = 0;
    let ownershipTransferred = 0;

    for (const homeId of plan.homesToDelete) {
      // Re-check emptiness: someone may have accepted an invitation between the
      // plan and now, and deleting their home would be unrecoverable.
      //
      // ensureHomeHasOwner doubles as that check. A home that gained a member
      // in the window is no longer ours to delete — and because invitees join
      // as 'member', it is now ownerless and needs a promotion instead. Merely
      // logging and moving on would leave the survivors unable to manage it.
      const outcome = await ensureHomeHasOwner(serviceClient, homeId);

      if (outcome === 'failed') {
        cleanupIncomplete = true;
        continue;
      }

      if (outcome !== 'empty') {
        if (outcome === 'promoted') ownershipTransferred += 1;
        console.warn(
          `delete-account: cleanup: home ${homeId} gained a member, leaving it in place (${outcome})`
        );
        continue;
      }

      const { error: deleteHomeError } = await serviceClient.from('homes').delete().eq('id', homeId);

      if (deleteHomeError) {
        console.error(`delete-account: cleanup: failed to delete home ${homeId}:`, deleteHomeError.message);
        cleanupIncomplete = true;
        continue;
      }

      homesDeleted += 1;
    }

    for (const homeId of plan.homesNeedingOwner) {
      const outcome = await ensureHomeHasOwner(serviceClient, homeId);

      if (outcome === 'failed') {
        cleanupIncomplete = true;
        continue;
      }

      // 'already-owned' means a co-owner appeared in the window, so no handover
      // was needed. 'empty' means every remaining member left — nothing to own,
      // and nothing worth deleting on their behalf.
      if (outcome === 'promoted') ownershipTransferred += 1;
    }

    if (cleanupIncomplete) {
      console.error(
        `delete-account: account ${userId} deleted, but home cleanup was incomplete and needs a manual sweep`
      );
    }

    return json({ success: true, homesDeleted, ownershipTransferred, cleanupIncomplete }, 200);
  } catch (error) {
    console.error('delete-account: unexpected error:', (error as Error).message);
    return json({ error: 'Failed to delete account' }, 500);
  }
});
