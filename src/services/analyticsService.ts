
import { supabase } from '../utils/supabase';
import { Purchase } from '../types';

/**
 * Unit conversion tables.
 * Each group maps units to a { base, factor } where:
 *   normalizedQty = quantity * factor   (converts to the base unit)
 *
 * Example: 100 g  → 100 * 0.001 = 0.1 kg
 *          1  kg  → 1   * 1     = 1   kg
 */
const unitGroups: Record<string, { base: string; factor: number }> = {
    // Weight
    g: { base: 'kg', factor: 0.001 },
    gms: { base: 'kg', factor: 0.001 },
    kg: { base: 'kg', factor: 1 },
    // Volume
    ml: { base: 'L', factor: 0.001 },
    L: { base: 'L', factor: 1 },
    // Count
    pcs: { base: 'pcs', factor: 1 },
    dozen: { base: 'pcs', factor: 12 },
    // Standalone (no conversion)
    pack: { base: 'pack', factor: 1 },
    box: { base: 'box', factor: 1 },
};

/**
 * Normalize a quantity + unit to the base unit of its group.
 * Returns { quantity: <in base units>, unit: <base unit name> }.
 * Unknown units are returned as-is.
 */
export function normalizeUnit(quantity: number, unit: string): { quantity: number; unit: string } {
    const entry = unitGroups[unit] || unitGroups[unit.toLowerCase()];
    if (!entry) return { quantity, unit };
    return { quantity: quantity * entry.factor, unit: entry.base };
}

/**
 * Get the base unit name for a given unit.
 */
export function getBaseUnit(unit: string): string {
    const entry = unitGroups[unit] || unitGroups[unit.toLowerCase()];
    return entry ? entry.base : unit;
}

/**
 * Calculate the normalized unit price for a purchase.
 * Converts quantity to the base unit first, then returns price per 1 base-unit.
 *
 * Example: ₹10 for 100 g  → normalizes to 0.1 kg → ₹10 / 0.1 = ₹100/kg
 *          ₹90 for 1  kg  → normalizes to 1   kg → ₹90 / 1   = ₹90/kg
 */
export function calcUnitPrice(price: number, quantity: number, unit?: string): { value: number; unit: string } {
    if (!quantity || quantity <= 0 || !price || price <= 0) return { value: 0, unit: unit || 'unit' };
    const normalized = normalizeUnit(quantity, unit || 'pcs');
    return { value: price / normalized.quantity, unit: normalized.unit };
}

/**
 * Simple numeric unit price (for backward-compat / sorting).
 */
export function calcUnitPriceValue(price: number, quantity: number, unit?: string): number {
    return calcUnitPrice(price, quantity, unit).value;
}

export const analyticsService = {
    async getPurchaseHistory(itemId: string) {
        const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .eq('item_id', itemId)
            .order('purchased_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data as Purchase[];
    },

    async getLatestPurchase(itemId: string): Promise<Purchase | null> {
        const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .eq('item_id', itemId)
            .order('purchased_at', { ascending: false })
            .limit(1)
            .single();

        if (error) return null;
        return data as Purchase;
    },

    async getBestValueStore(itemId: string) {
        // Fetch all purchases and find the one with the lowest unit price
        const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .eq('item_id', itemId)
            .gt('price', 0)
            .gt('quantity', 0);

        if (error) throw error;
        if (!data || data.length === 0) return null;

        // Sort by normalized unit price ascending
        const sorted = (data as Purchase[]).sort((a, b) => {
            return calcUnitPriceValue(a.price, a.quantity, a.unit) - calcUnitPriceValue(b.price, b.quantity, b.unit);
        });

        return sorted[0];
    },

    async updatePurchaseRating(purchaseId: string, rating: number) {
        const { data, error } = await supabase
            .from('purchases')
            .update({ rating })
            .eq('id', purchaseId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getAllPurchasesForHome(homeId: string) {
        const { data, error } = await supabase
            .from('purchases')
            .select(`
                *,
                items!inner(name, home_id)
            `)
            .eq('items.home_id', homeId)
            .order('purchased_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return data;
    },

    async getPurchaseCount(itemId: string): Promise<number> {
        const { count, error } = await supabase
            .from('purchases')
            .select('*', { count: 'exact', head: true })
            .eq('item_id', itemId);

        if (error) return 0;
        return count || 0;
    }
};
