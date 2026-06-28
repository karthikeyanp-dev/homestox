import { beforeEach, describe, expect, it, vi } from 'vitest';

// Chainable Supabase client mock (same pattern as inventoryService.test.ts).
// Terminal calls resolve to the next enqueued { data, error } result in order.
const { supabaseMock, enqueue, resetQueue } = vi.hoisted(() => {
  type Result = { data?: unknown; error?: unknown };
  const queue: Result[] = [];
  const next = (): Result => queue.shift() ?? { data: null, error: null };

  const supabaseMock: any = {
    from: vi.fn(() => supabaseMock),
    select: vi.fn(() => supabaseMock),
    insert: vi.fn(() => supabaseMock),
    update: vi.fn(() => supabaseMock),
    delete: vi.fn(() => supabaseMock),
    upsert: vi.fn(() => supabaseMock),
    eq: vi.fn(() => supabaseMock),
    neq: vi.fn(() => supabaseMock),
    order: vi.fn(() => supabaseMock),
    limit: vi.fn(() => supabaseMock),
    single: vi.fn(() => Promise.resolve(next())),
    maybeSingle: vi.fn(() => Promise.resolve(next())),
    rpc: vi.fn(() => Promise.resolve(next())),
    then: (onFulfilled: any, onRejected?: any) =>
      Promise.resolve(next()).then(onFulfilled, onRejected),
  };

  return {
    supabaseMock,
    enqueue: (...results: Result[]) => {
      queue.push(...results);
    },
    resetQueue: () => {
      queue.length = 0;
    },
  };
});

vi.mock('../utils/supabase', () => ({ supabase: supabaseMock }));

import { profileService } from '../services/profileService';

describe('profileService', () => {
  beforeEach(() => {
    resetQueue();
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns the profile row for a user id', async () => {
      const profile = {
        id: 'user-1',
        email: 'alice@example.com',
        full_name: 'Alice',
        avatar_url: null,
      };
      enqueue({ data: profile, error: null });

      const result = await profileService.getProfile('user-1');

      expect(result).toEqual(profile);
      expect(supabaseMock.from).toHaveBeenCalledWith('profiles');
      expect(supabaseMock.select).toHaveBeenCalledWith('id, email, full_name, avatar_url');
      expect(supabaseMock.eq).toHaveBeenCalledWith('id', 'user-1');
      expect(supabaseMock.single).toHaveBeenCalled();
    });

    it('returns null and logs when the query errors', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      enqueue({ data: null, error: { message: 'boom' } });

      const result = await profileService.getProfile('user-1');

      expect(result).toBeNull();
      errorSpy.mockRestore();
    });
  });

  describe('getDisplayName', () => {
    it('returns the full_name when present', async () => {
      enqueue({ data: { full_name: 'Alice', email: 'alice@example.com' }, error: null });

      const result = await profileService.getDisplayName('user-1');

      expect(result).toBe('Alice');
      expect(supabaseMock.select).toHaveBeenCalledWith('full_name, email');
    });

    it('falls back to the email local-part when full_name is missing', async () => {
      enqueue({ data: { full_name: null, email: 'bob@example.com' }, error: null });

      const result = await profileService.getDisplayName('user-1');

      expect(result).toBe('bob');
    });

    it('returns "Someone" when the query errors', async () => {
      enqueue({ data: null, error: { message: 'no profile' } });

      const result = await profileService.getDisplayName('user-1');

      expect(result).toBe('Someone');
    });

    it('returns "Someone" when the query returns no data', async () => {
      enqueue({ data: null, error: null });

      const result = await profileService.getDisplayName('user-1');

      expect(result).toBe('Someone');
    });

    it('returns "Someone" when neither full_name nor email are present', async () => {
      enqueue({ data: { full_name: '', email: '' }, error: null });

      const result = await profileService.getDisplayName('user-1');

      expect(result).toBe('Someone');
    });
  });
});
