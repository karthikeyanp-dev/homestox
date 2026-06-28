
import { supabase } from '../utils/supabase';
import { Item, ItemCategory } from '../types';
import { notificationService } from './notificationService';
import { profileService } from './profileService';

export const inventoryService = {
    async fetchInventory(homeId: string) {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('home_id', homeId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data as Item[];
    },

    async updateStatus(itemId: string, status: Item['status'], userId?: string) {
        // First get the item details for notification
        const { data: itemData, error: itemError } = await supabase
            .from('items')
            .select('*')
            .eq('id', itemId)
            .single();

        if (itemError) throw itemError;

        const { data, error } = await supabase
            .from('items')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;

        // Send notification to home members
        if (userId && itemData) {
            const senderName = await profileService.getDisplayName(userId);
            notificationService.notifyItemStatusUpdate(
                itemData.home_id,
                userId,
                itemId,
                itemData.name,
                status,
                senderName
            ).catch(console.error);
        }

        return data as Item;
    },

    async addItem(homeId: string, name: string, category?: ItemCategory, userId?: string) {
        const { data, error } = await supabase
            .from('items')
            .insert({
                home_id: homeId,
                name,
                status: 'enough',
                ...(category && { category }),
            })
            .select()
            .single();

        if (error) throw error;

        // Send notification to home members
        if (userId) {
            const senderName = await profileService.getDisplayName(userId);
            notificationService.notifyItemAdded(
                homeId,
                userId,
                data.id,
                name,
                senderName
            ).catch(console.error);
        }

        return data as Item;
    },

    async updateItemDetails(itemId: string, updates: Partial<Item>, userId?: string) {
        const { data, error } = await supabase
            .from('items')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        return data as Item;
    },

    async deleteItem(itemId: string, userId?: string) {
        // First get the item details for notification
        const { data: itemData, error: itemError } = await supabase
            .from('items')
            .select('*')
            .eq('id', itemId)
            .single();

        if (itemError) throw itemError;

        // With ON DELETE CASCADE at database level, purchases are auto-deleted
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', itemId);

        if (error) throw error;

        // Send notification to home members
        if (userId && itemData) {
            const senderName = await profileService.getDisplayName(userId);
            notificationService.notifyItemDeleted(
                itemData.home_id,
                userId,
                itemData.name,
                senderName
            ).catch(console.error);
        }
    },

    async addItemWithStatus(homeId: string, name: string, status: Item['status'], category?: ItemCategory, userId?: string) {
        const { data, error } = await supabase
            .from('items')
            .insert({
                home_id: homeId,
                name,
                status,
                ...(category && { category }),
            })
            .select()
            .single();

        if (error) throw error;

        // Send notification to home members
        if (userId) {
            const senderName = await profileService.getDisplayName(userId);
            notificationService.notifyItemAdded(
                homeId,
                userId,
                data.id,
                name,
                senderName
            ).catch(console.error);
        }

        return data as Item;
    },

    async toggleNotRequired(itemId: string, notRequired: boolean) {
        const { data, error } = await supabase
            .from('items')
            .update({ not_required: notRequired, updated_at: new Date().toISOString() })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        return data as Item;
    }
};
