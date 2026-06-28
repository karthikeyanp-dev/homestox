import { describe, expect, it } from 'vitest';

import { buildShoppingShareText } from '../utils/shoppingShareText';
import type { Item } from '../types';

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'i1',
  home_id: 'home-1',
  name: 'Milk',
  status: 'finished',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('buildShoppingShareText', () => {
  it('renders a header without a home name', () => {
    const text = buildShoppingShareText([]);
    expect(text.split('\n')[0]).toBe('🛒 Shopping List');
  });

  it('renders a header with the home name when provided', () => {
    const text = buildShoppingShareText([], 'My Home');
    expect(text.split('\n')[0]).toBe('🛒 Shopping List — My Home');
  });

  it('groups urgent (finished) and low stock (nearing) items separately', () => {
    const items = [
      item({ id: 'a', name: 'Milk', status: 'finished' }),
      item({ id: 'b', name: 'Rice', status: 'nearing' }),
    ];

    const text = buildShoppingShareText(items, 'My Home');

    expect(text).toContain('🔴 URGENT (1)');
    expect(text).toContain('🟡 LOW STOCK (1)');
    expect(text).toContain('• Milk');
    expect(text).toContain('• Rice');
  });

  it('sorts items within each group alphabetically by name', () => {
    const items = [
      item({ id: 'a', name: 'Tomatoes', status: 'finished' }),
      item({ id: 'b', name: 'Eggs', status: 'finished' }),
      item({ id: 'c', name: 'Milk', status: 'finished' }),
    ];

    const text = buildShoppingShareText(items);

    const lines = text.split('\n');
    const urgentStart = lines.indexOf('🔴 URGENT (3)');
    expect(lines[urgentStart + 1]).toBe('• Eggs');
    expect(lines[urgentStart + 2]).toBe('• Milk');
    expect(lines[urgentStart + 3]).toBe('• Tomatoes');
  });

  it('appends the brand in parentheses when current_brand is present', () => {
    const items = [item({ id: 'a', name: 'Milk', status: 'finished', current_brand: 'Amul' })];

    const text = buildShoppingShareText(items);

    expect(text).toContain('• Milk (Amul)');
  });

  it('omits the brand when current_brand is only whitespace', () => {
    const items = [item({ id: 'a', name: 'Milk', status: 'finished', current_brand: '   ' })];

    const text = buildShoppingShareText(items);

    expect(text).toContain('• Milk\n');
    expect(text).not.toContain('• Milk (');
  });

  it('only renders the low stock group when there are no urgent items', () => {
    const items = [item({ id: 'a', name: 'Rice', status: 'nearing' })];

    const text = buildShoppingShareText(items);

    expect(text).not.toContain('🔴 URGENT');
    expect(text).toContain('🟡 LOW STOCK (1)');
    expect(text).toContain('• Rice');
  });

  it('only renders the urgent group when there are no low stock items', () => {
    const items = [item({ id: 'a', name: 'Milk', status: 'finished' })];

    const text = buildShoppingShareText(items);

    expect(text).toContain('🔴 URGENT (1)');
    expect(text).not.toContain('🟡 LOW STOCK');
  });

  it('ignores items that are neither finished nor nearing', () => {
    // Caller is expected to filter not_required first; status 'enough' items
    // are never included in either group and do not count toward the total.
    const items = [
      item({ id: 'a', name: 'Milk', status: 'finished' }),
      item({ id: 'b', name: 'Bread', status: 'enough' }),
    ];

    const text = buildShoppingShareText(items, 'My Home');

    expect(text).toContain('• Milk');
    expect(text).not.toContain('• Bread');
    expect(text).toContain('Total: 1 item to buy');
  });

  it('reports a singular "item" footer for a single item', () => {
    const items = [item({ id: 'a', name: 'Milk', status: 'finished' })];

    const text = buildShoppingShareText(items);

    expect(text).toContain('Total: 1 item to buy');
  });

  it('reports a plural "items" footer for multiple items', () => {
    const items = [
      item({ id: 'a', name: 'Milk', status: 'finished' }),
      item({ id: 'b', name: 'Rice', status: 'nearing' }),
    ];

    const text = buildShoppingShareText(items);

    expect(text).toContain('Total: 2 items to buy');
  });

  it('renders an empty list with just header and a zero-item footer', () => {
    const text = buildShoppingShareText([]);

    expect(text).toBe('🛒 Shopping List\n\nTotal: 0 items to buy');
  });
});
