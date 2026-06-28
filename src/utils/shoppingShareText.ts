import { Item } from '../types';

/**
 * Build a well-formatted plain-text version of the shopping list for sharing.
 *
 * Pure function: no React, no side effects.
 *
 * Expected input: items already filtered to those needing restock
 * (status 'finished' = urgent, 'nearing' = low stock). Items marked
 * `not_required` should be excluded by the caller.
 *
 * Output example:
 * ```
 * 🛒 Shopping List — My Home
 *
 * 🔴 URGENT (3)
 * • Milk (Amul)
 * • Eggs
 * • Tomatoes
 *
 * 🟡 LOW STOCK (2)
 * • Rice
 * • Cooking Oil
 *
 * Total: 5 items to buy
 * ```
 */
export function buildShoppingShareText(items: Item[], homeName?: string): string {
    const urgent = items
        .filter((i) => i.status === 'finished')
        .sort((a, b) => a.name.localeCompare(b.name));
    const low = items
        .filter((i) => i.status === 'nearing')
        .sort((a, b) => a.name.localeCompare(b.name));

    const lines: string[] = [];

    // Header line
    const header = homeName
        ? `🛒 Shopping List — ${homeName}`
        : '🛒 Shopping List';
    lines.push(header);

    // Urgent group
    if (urgent.length > 0) {
        lines.push('');
        lines.push(`🔴 URGENT (${urgent.length})`);
        urgent.forEach((item) => lines.push(formatItemLine(item)));
    }

    // Low stock group
    if (low.length > 0) {
        lines.push('');
        lines.push(`🟡 LOW STOCK (${low.length})`);
        low.forEach((item) => lines.push(formatItemLine(item)));
    }

    // Total footer
    const total = urgent.length + low.length;
    lines.push('');
    lines.push(`Total: ${total} item${total === 1 ? '' : 's'} to buy`);

    return lines.join('\n');
}

/** Format a single item line, appending the brand in parentheses when present. */
function formatItemLine(item: Item): string {
    const brand = item.current_brand?.trim();
    return brand ? `• ${item.name} (${brand})` : `• ${item.name}`;
}
