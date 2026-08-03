import { beforeEach, describe, expect, it, vi } from 'vitest';

// Chainable Supabase client mock (same pattern as profileService.test.ts).
// Terminal calls resolve to the next enqueued result in order.
const { supabaseMock, enqueue, resetQueue, setSession, invokeMock } = vi.hoisted(() => {
  type Result = { data?: unknown; error?: unknown; count?: number | null };
  const queue: Result[] = [];
  const next = (): Result => queue.shift() ?? { data: null, error: null, count: null };

  let session: unknown = { access_token: 'token-123' };

  // Parameters are declared so `invokeMock.mock.calls[0]` infers as
  // [string, InvokeOptions?] rather than []. Without them the recorded call
  // tuple is empty and any attempt to read the options argument needs a cast.
  const invokeMock = vi.fn((_functionName: string, _options?: Record<string, unknown>) =>
    Promise.resolve(next())
  );

  const supabaseMock: any = {
    from: vi.fn(() => supabaseMock),
    select: vi.fn(() => supabaseMock),
    eq: vi.fn(() => supabaseMock),
    neq: vi.fn(() => supabaseMock),
    single: vi.fn(() => Promise.resolve(next())),
    maybeSingle: vi.fn(() => Promise.resolve(next())),
    then: (onFulfilled: any, onRejected?: any) =>
      Promise.resolve(next()).then(onFulfilled, onRejected),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session } })),
    },
    functions: {
      invoke: invokeMock,
    },
  };

  return {
    supabaseMock,
    invokeMock,
    enqueue: (...results: Result[]) => {
      queue.push(...results);
    },
    resetQueue: () => {
      queue.length = 0;
    },
    setSession: (value: unknown) => {
      session = value;
    },
  };
});

vi.mock('../utils/supabase', () => ({ supabase: supabaseMock }));

import { accountService } from '../services/accountService';

describe('accountService', () => {
  beforeEach(() => {
    resetQueue();
    vi.clearAllMocks();
    setSession({ access_token: 'token-123' });
  });

  describe('getDeletionImpact', () => {
    it('flags a home where the user is the only member for deletion', async () => {
      enqueue(
        // memberships
        { data: [{ home_id: 'home-1', role: 'owner', homes: { name: 'Flat 2B' } }], error: null },
        // survivors of home-1
        { data: [], error: null }
      );

      const impact = await accountService.getDeletionImpact('user-1');

      expect(impact.homesToDelete).toEqual(['Flat 2B']);
      expect(impact.homesToTransfer).toEqual([]);
    });

    it('flags a shared home for transfer when the user is its last owner', async () => {
      enqueue(
        { data: [{ home_id: 'home-1', role: 'owner', homes: { name: 'Flat 2B' } }], error: null },
        { data: [{ role: 'member' }, { role: 'member' }], error: null }
      );

      const impact = await accountService.getDeletionImpact('user-1');

      expect(impact.homesToDelete).toEqual([]);
      expect(impact.homesToTransfer).toEqual(['Flat 2B']);
    });

    it('does not promise a transfer when another owner remains', async () => {
      // The Edge Function skips the handover entirely when a co-owner is left,
      // so claiming otherwise would tell the user their household is changing
      // hands when it is not.
      enqueue(
        { data: [{ home_id: 'home-1', role: 'owner', homes: { name: 'Flat 2B' } }], error: null },
        { data: [{ role: 'owner' }, { role: 'member' }], error: null }
      );

      const impact = await accountService.getDeletionImpact('user-1');

      expect(impact.homesToDelete).toEqual([]);
      expect(impact.homesToTransfer).toEqual([]);
    });

    it('leaves a shared home the user does not own untouched', async () => {
      enqueue(
        { data: [{ home_id: 'home-1', role: 'member', homes: { name: 'Flat 2B' } }], error: null },
        { data: [{ role: 'owner' }, { role: 'member' }], error: null }
      );

      const impact = await accountService.getDeletionImpact('user-1');

      expect(impact.homesToDelete).toEqual([]);
      expect(impact.homesToTransfer).toEqual([]);
    });

    it('handles the embedded home arriving as an array', async () => {
      // PostgREST returns embedded relations as an array in some shapes; the
      // service normalises both so the dialog never renders "Unnamed home".
      enqueue(
        { data: [{ home_id: 'home-1', role: 'owner', homes: [{ name: 'Flat 2B' }] }], error: null },
        { data: [], error: null }
      );

      const impact = await accountService.getDeletionImpact('user-1');

      expect(impact.homesToDelete).toEqual(['Flat 2B']);
    });

    it('returns empty lists when the user belongs to no homes', async () => {
      enqueue({ data: [], error: null });

      const impact = await accountService.getDeletionImpact('user-1');

      expect(impact).toEqual({ homesToDelete: [], homesToTransfer: [] });
    });

    it('throws when the membership query fails', async () => {
      enqueue({ data: null, error: { message: 'boom' } });

      await expect(accountService.getDeletionImpact('user-1')).rejects.toBeDefined();
    });
  });

  describe('deleteAccount', () => {
    it('invokes the edge function with the session token and returns its summary', async () => {
      enqueue({ data: { success: true, homesDeleted: 2, ownershipTransferred: 1 }, error: null });

      const result = await accountService.deleteAccount();

      expect(invokeMock).toHaveBeenCalledWith('delete-account', {
        headers: { Authorization: 'Bearer token-123' },
      });
      expect(result).toEqual({ homesDeleted: 2, ownershipTransferred: 1, cleanupIncomplete: false });
    });

    it('surfaces cleanupIncomplete without failing the deletion', async () => {
      // The account is gone either way — reporting failure here would invite a
      // pointless retry against an account that no longer exists.
      enqueue({ data: { success: true, cleanupIncomplete: true }, error: null });

      const result = await accountService.deleteAccount();

      expect(result.cleanupIncomplete).toBe(true);
    });

    it('never sends a user id — the function derives it from the token', async () => {
      enqueue({ data: { success: true }, error: null });

      await accountService.deleteAccount();

      const [, options] = invokeMock.mock.calls[0];
      expect(options).toBeDefined();
      expect(options).not.toHaveProperty('body');
    });

    it('throws without calling the function when there is no session', async () => {
      setSession(null);

      await expect(accountService.deleteAccount()).rejects.toThrow(/no longer signed in/i);
      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('throws when the function returns an error', async () => {
      enqueue({ data: null, error: { message: 'network down' } });

      await expect(accountService.deleteAccount()).rejects.toThrow(/could not delete your account/i);
    });

    it('throws when the function responds without success', async () => {
      enqueue({ data: { success: false }, error: null });

      await expect(accountService.deleteAccount()).rejects.toThrow(/could not delete your account/i);
    });
  });
});
