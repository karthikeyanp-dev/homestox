import { beforeEach, describe, expect, it, vi } from 'vitest';

// Chainable Supabase client mock (see inventoryService.test.ts for details).
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
// Each notify* returns a resolved promise because the service chains
// `.catch(console.error)` on the result.
vi.mock('../services/notificationService', () => ({
  notificationService: {
    notifyItemStatusUpdate: vi.fn(() => Promise.resolve()),
    notifyItemPurchase: vi.fn(() => Promise.resolve()),
    notifyItemAdded: vi.fn(() => Promise.resolve()),
    notifyItemDeleted: vi.fn(() => Promise.resolve()),
  },
}));

import { shoppingService } from '../services/shoppingService';
import { notificationService } from '../services/notificationService';
import type { Item } from '../types';

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'i1',
  home_id: 'home-1',
  name: 'Milk',
  status: 'enough',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('shoppingService', () => {
  beforeEach(() => {
    resetQueue();
    vi.clearAllMocks();
  });

  describe('checkoutItem', () => {
    it('fetches the item, invokes the checkout_item rpc, and notifies members', async () => {
      enqueue(
        { data: item({ id: 'i1', home_id: 'home-1', name: 'Milk' }), error: null }, // item fetch
        { error: null }, // rpc
        { data: { full_name: 'Alice' }, error: null }, // profile lookup
      );

      await shoppingService.checkoutItem('i1', 'user-1', 50, 'Amul', 'Mart', 4, 2, 'kg');

      expect(supabaseMock.rpc).toHaveBeenCalledWith('checkout_item', {
        item_uuid: 'i1',
        user_uuid: 'user-1',
        price: 50,
        brand: 'Amul',
        store_name: 'Mart',
        rating: 4,
        qty: 2,
        unit: 'kg',
      });
      expect(vi.mocked(notificationService.notifyItemPurchase)).toHaveBeenCalledWith(
        'home-1',
        'user-1',
        'i1',
        'Milk',
        'Alice',
        'Mart',
      );
    });

    it('converts a zero rating to null (unrated)', async () => {
      enqueue(
        { data: item(), error: null },
        { error: null },
        { data: { full_name: 'Alice' }, error: null },
      );

      await shoppingService.checkoutItem('i1', 'user-1', 50, 'Amul', 'Mart', 0, 2, 'kg');

      const rpcArg = vi.mocked(supabaseMock.rpc).mock.calls[0][1];
      expect(rpcArg.rating).toBeNull();
    });

    it('passes a non-zero rating through unchanged', async () => {
      enqueue(
        { data: item(), error: null },
        { error: null },
        { data: { full_name: 'Alice' }, error: null },
      );

      await shoppingService.checkoutItem('i1', 'user-1', 50, 'Amul', 'Mart', 3, 1, 'pcs');

      const rpcArg = vi.mocked(supabaseMock.rpc).mock.calls[0][1];
      expect(rpcArg.rating).toBe(3);
    });

    it('throws when the item fetch fails', async () => {
      enqueue({ data: null, error: { message: 'fetch failed' } });

      await expect(
        shoppingService.checkoutItem('i1', 'user-1', 50, 'Amul', 'Mart', 4, 2, 'kg'),
      ).rejects.toEqual({ message: 'fetch failed' });
      expect(supabaseMock.rpc).not.toHaveBeenCalled();
    });

    it('throws when the rpc fails and skips notification', async () => {
      enqueue(
        { data: item(), error: null },
        { error: { message: 'rpc failed' } },
      );

      await expect(
        shoppingService.checkoutItem('i1', 'user-1', 50, 'Amul', 'Mart', 4, 2, 'kg'),
      ).rejects.toEqual({ message: 'rpc failed' });
      expect(vi.mocked(notificationService.notifyItemPurchase)).not.toHaveBeenCalled();
    });
  });
});
