import { beforeEach, describe, expect, it, vi } from 'vitest';

// Build a chainable Supabase client mock via vi.hoisted so it is available
// inside the hoisted vi.mock() factory. The query builder methods return the
// same object (mirroring supabase-js' fluent API), and terminal calls —
// `.single()` / `.maybeSingle()` / `.rpc()` / awaiting the chain directly —
// resolve to the next enqueued { data, error } result in call order.
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

// Stub notificationService so the fire-and-forget notify*() calls in
// inventoryService don't fan out into real supabase auth/functions calls,
// and so we can assert dispatch behavior. Each notify* returns a resolved
// promise because the service chains `.catch(console.error)` on the result.
vi.mock('../services/notificationService', () => ({
  notificationService: {
    notifyItemStatusUpdate: vi.fn(() => Promise.resolve()),
    notifyItemPurchase: vi.fn(() => Promise.resolve()),
    notifyItemAdded: vi.fn(() => Promise.resolve()),
    notifyItemDeleted: vi.fn(() => Promise.resolve()),
  },
}));

import { inventoryService } from '../services/inventoryService';
import { notificationService } from '../services/notificationService';
import type { Item } from '../types';

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  home_id: 'home-1',
  name: 'Milk',
  status: 'enough',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('inventoryService', () => {
  beforeEach(() => {
    resetQueue();
    vi.clearAllMocks();
  });

  describe('fetchInventory', () => {
    it('returns items for a home ordered by updated_at desc', async () => {
      const items = [item({ id: 'a' }), item({ id: 'b' })];
      enqueue({ data: items, error: null });

      const result = await inventoryService.fetchInventory('home-1');

      expect(result).toEqual(items);
      expect(supabaseMock.from).toHaveBeenCalledWith('items');
      expect(supabaseMock.eq).toHaveBeenCalledWith('home_id', 'home-1');
      expect(supabaseMock.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    });

    it('throws when the query returns an error', async () => {
      enqueue({ data: null, error: { message: 'fetch failed' } });
      await expect(inventoryService.fetchInventory('home-1')).rejects.toEqual({
        message: 'fetch failed',
      });
    });
  });

  describe('addItem', () => {
    it('inserts with default status "enough" and returns the created item', async () => {
      const created = item({ id: 'new', name: 'Bread' });
      enqueue({ data: created, error: null });

      const result = await inventoryService.addItem('home-1', 'Bread');

      expect(result).toEqual(created);
      const insertArg = vi.mocked(supabaseMock.insert).mock.calls[0][0];
      expect(insertArg).toMatchObject({ home_id: 'home-1', name: 'Bread', status: 'enough' });
      expect('category' in insertArg).toBe(false);
    });

    it('includes category when provided', async () => {
      enqueue({ data: item({ id: 'new', category: 'Bakery & Breads' }), error: null });
      await inventoryService.addItem('home-1', 'Bread', 'Bakery & Breads');
      const insertArg = vi.mocked(supabaseMock.insert).mock.calls[0][0];
      expect(insertArg).toMatchObject({ category: 'Bakery & Breads' });
    });

    it('notifies home members with the sender name when userId is provided', async () => {
      enqueue(
        { data: item({ id: 'new', name: 'Bread' }), error: null }, // insert
        { data: { full_name: 'Alice' }, error: null }, // profile lookup
      );

      await inventoryService.addItem('home-1', 'Bread', undefined, 'user-1');

      expect(vi.mocked(notificationService.notifyItemAdded)).toHaveBeenCalledWith(
        'home-1',
        'user-1',
        'new',
        'Bread',
        'Alice',
      );
    });

    it('falls back to the email username when full_name is missing', async () => {
      enqueue(
        { data: item({ id: 'new', name: 'Bread' }), error: null },
        { data: { email: 'bob@example.com' }, error: null },
      );

      await inventoryService.addItem('home-1', 'Bread', undefined, 'user-1');

      expect(vi.mocked(notificationService.notifyItemAdded)).toHaveBeenCalledWith(
        'home-1',
        'user-1',
        'new',
        'Bread',
        'bob',
      );
    });

    it('uses "Someone" when the profile lookup returns nothing', async () => {
      enqueue(
        { data: item({ id: 'new', name: 'Bread' }), error: null },
        { data: null, error: { message: 'no profile' } },
      );

      await inventoryService.addItem('home-1', 'Bread', undefined, 'user-1');

      expect(vi.mocked(notificationService.notifyItemAdded)).toHaveBeenCalledWith(
        'home-1',
        'user-1',
        'new',
        'Bread',
        'Someone',
      );
    });

    it('does not notify when userId is omitted', async () => {
      enqueue({ data: item({ id: 'new', name: 'Bread' }), error: null });

      await inventoryService.addItem('home-1', 'Bread');

      expect(vi.mocked(notificationService.notifyItemAdded)).not.toHaveBeenCalled();
    });

    it('throws when insert fails', async () => {
      enqueue({ data: null, error: { message: 'insert failed' } });
      await expect(inventoryService.addItem('home-1', 'Bread')).rejects.toEqual({
        message: 'insert failed',
      });
    });
  });

  describe('addItemWithStatus', () => {
    it('inserts with the provided status and notifies members', async () => {
      enqueue(
        { data: item({ id: 'new', name: 'Rice', status: 'finished' }), error: null },
        { data: { full_name: 'Alice' }, error: null },
      );

      const result = await inventoryService.addItemWithStatus(
        'home-1',
        'Rice',
        'finished',
        undefined,
        'user-1',
      );

      expect(result.status).toBe('finished');
      const insertArg = vi.mocked(supabaseMock.insert).mock.calls[0][0];
      expect(insertArg).toMatchObject({ status: 'finished' });
      expect(vi.mocked(notificationService.notifyItemAdded)).toHaveBeenCalledWith(
        'home-1',
        'user-1',
        'new',
        'Rice',
        'Alice',
      );
    });
  });

  describe('updateStatus', () => {
    it('updates the item status and returns the updated item', async () => {
      enqueue(
        { data: item({ id: 'i1', name: 'Milk', status: 'enough' }), error: null }, // fetch
        { data: item({ id: 'i1', name: 'Milk', status: 'nearing' }), error: null }, // update
      );

      const result = await inventoryService.updateStatus('i1', 'nearing');

      expect(result.status).toBe('nearing');
      const updateArg = vi.mocked(supabaseMock.update).mock.calls[0][0];
      expect(updateArg).toMatchObject({ status: 'nearing' });
      expect(updateArg.updated_at).toEqual(expect.any(String));
    });

    it('notifies home members with the sender name', async () => {
      enqueue(
        { data: item({ id: 'i1', home_id: 'home-1', name: 'Milk', status: 'enough' }), error: null },
        { data: item({ id: 'i1', name: 'Milk', status: 'finished' }), error: null },
        { data: { full_name: 'Alice' }, error: null }, // profile lookup
      );

      await inventoryService.updateStatus('i1', 'finished', 'user-1');

      expect(vi.mocked(notificationService.notifyItemStatusUpdate)).toHaveBeenCalledWith(
        'home-1',
        'user-1',
        'i1',
        'Milk',
        'finished',
        'Alice',
      );
    });

    it('skips notification when userId is omitted', async () => {
      enqueue(
        { data: item({ id: 'i1', name: 'Milk' }), error: null },
        { data: item({ id: 'i1', name: 'Milk', status: 'finished' }), error: null },
      );

      await inventoryService.updateStatus('i1', 'finished');

      expect(vi.mocked(notificationService.notifyItemStatusUpdate)).not.toHaveBeenCalled();
    });

    it('throws when the fetch fails', async () => {
      enqueue({ data: null, error: { message: 'fetch failed' } });
      await expect(
        inventoryService.updateStatus('i1', 'nearing', 'user-1'),
      ).rejects.toEqual({ message: 'fetch failed' });
    });

    it('throws when the update fails', async () => {
      enqueue(
        { data: item({ id: 'i1', name: 'Milk' }), error: null },
        { data: null, error: { message: 'update failed' } },
      );

      await expect(
        inventoryService.updateStatus('i1', 'nearing', 'user-1'),
      ).rejects.toEqual({ message: 'update failed' });
    });
  });

  describe('updateItemDetails', () => {
    it('updates fields and returns the item', async () => {
      enqueue({ data: item({ id: 'i1', current_brand: 'Amul' }), error: null });

      const result = await inventoryService.updateItemDetails('i1', { current_brand: 'Amul' });

      expect(result.current_brand).toBe('Amul');
      const updateArg = vi.mocked(supabaseMock.update).mock.calls[0][0];
      expect(updateArg).toMatchObject({ current_brand: 'Amul' });
      expect(updateArg.updated_at).toEqual(expect.any(String));
    });

    it('throws when the update fails', async () => {
      enqueue({ data: null, error: { message: 'update failed' } });
      await expect(
        inventoryService.updateItemDetails('i1', { current_brand: 'Amul' }),
      ).rejects.toEqual({ message: 'update failed' });
    });
  });

  describe('toggleNotRequired', () => {
    it('sets not_required and returns the item', async () => {
      enqueue({ data: item({ id: 'i1', not_required: true }), error: null });

      const result = await inventoryService.toggleNotRequired('i1', true);

      expect(result.not_required).toBe(true);
      const updateArg = vi.mocked(supabaseMock.update).mock.calls[0][0];
      expect(updateArg).toMatchObject({ not_required: true });
    });

    it('throws when the update fails', async () => {
      enqueue({ data: null, error: { message: 'toggle failed' } });
      await expect(inventoryService.toggleNotRequired('i1', true)).rejects.toEqual({
        message: 'toggle failed',
      });
    });
  });

  describe('deleteItem', () => {
    it('fetches the item, deletes it, and notifies members', async () => {
      enqueue(
        { data: item({ id: 'i1', home_id: 'home-1', name: 'Milk' }), error: null }, // fetch
        { error: null }, // delete
        { data: { full_name: 'Alice' }, error: null }, // profile lookup
      );

      await inventoryService.deleteItem('i1', 'user-1');

      expect(supabaseMock.delete).toHaveBeenCalled();
      expect(vi.mocked(notificationService.notifyItemDeleted)).toHaveBeenCalledWith(
        'home-1',
        'user-1',
        'Milk',
        'Alice',
      );
    });

    it('does not notify when userId is omitted', async () => {
      enqueue(
        { data: item({ id: 'i1', name: 'Milk' }), error: null },
        { error: null },
      );

      await inventoryService.deleteItem('i1');

      expect(vi.mocked(notificationService.notifyItemDeleted)).not.toHaveBeenCalled();
    });

    it('throws when the fetch fails', async () => {
      enqueue({ data: null, error: { message: 'fetch failed' } });
      await expect(inventoryService.deleteItem('i1', 'user-1')).rejects.toEqual({
        message: 'fetch failed',
      });
    });

    it('throws when the delete fails', async () => {
      enqueue(
        { data: item({ id: 'i1', name: 'Milk' }), error: null },
        { error: { message: 'delete failed' } },
      );

      await expect(inventoryService.deleteItem('i1', 'user-1')).rejects.toEqual({
        message: 'delete failed',
      });
    });
  });
});
