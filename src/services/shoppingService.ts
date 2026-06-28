
import { supabase } from '../utils/supabase';
import { notificationService } from './notificationService';
import { profileService } from './profileService';

export const shoppingService = {
    async checkoutItem(
        itemId: string,
        userId: string,
        price: number,
        brand: string,
        storeName: string,
        rating: number | null,
        qty: number,
        unit: string
    ) {
        // Get item details before checkout for notification
        const { data: itemData, error: itemError } = await supabase
            .from('items')
            .select('*')
            .eq('id', itemId)
            .single();

        if (itemError) throw itemError;

        const { error } = await supabase.rpc('checkout_item', {
            item_uuid: itemId,
            user_uuid: userId,
            price,
            brand,
            store_name: storeName,
            rating: rating === 0 ? null : rating, // Pass null for unrated
            qty,
            unit,
        });

        if (error) throw error;

        // Send notification to home members
        const senderName = await profileService.getDisplayName(userId);
        notificationService.notifyItemPurchase(
            itemData.home_id,
            userId,
            itemId,
            itemData.name,
            senderName,
            storeName
        ).catch(console.error);
    },
};
