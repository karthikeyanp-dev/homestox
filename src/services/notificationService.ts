import Notifications from '../utils/notifications';
import type { EventSubscription, Notification, NotificationResponse } from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../utils/supabase';

const PUSH_TOKEN_STORAGE_KEY = 'homestox_push_token';

/**
 * Expo Go does not support `expo-notifications` remote push notifications as of SDK 53.
 * Detect it so we can gracefully skip push registration and avoid the
 * "[runtime not ready]: expo-notifications ... functionality provided by expo-notifications
 * was removed from Expo Go" error. Use a development build for full push support.
 */
const isExpoGo = Constants.executionEnvironment === 'storeClient';

type HomeNotificationType = 'status_update' | 'purchase' | 'item_added' | 'item_deleted';

export interface PushTokenData {
    user_id: string;
    push_token: string;
    device_type: 'ios' | 'android' | 'web';
    created_at?: string;
    updated_at?: string;
}

export interface HomeNotification {
    id: string;
    home_id: string;
    user_id: string;
    title: string;
    body: string;
    type: HomeNotificationType;
    item_id?: string;
    item_name?: string;
    read: boolean;
    created_at: string;
}

interface SendToHomePayload {
    homeId: string;
    title: string;
    body: string;
    type: HomeNotificationType;
    itemId?: string;
    itemName?: string;
    data?: Record<string, unknown>;
}

class NotificationService {
    private notificationSubscription: EventSubscription | null = null;
    private responseSubscription: EventSubscription | null = null;

    /**
     * Register for push notifications and save the token to the database.
     * In Expo Go this is a no-op (returns null) because Expo Go no longer
     * supports remote push notifications as of SDK 53. Use a development build.
     */
    async registerForPushNotifications(userId: string): Promise<string | null> {
        if (isExpoGo) {
            console.info(
                '[notifications] Skipping push registration — push notifications are not available in Expo Go. Use a development build.'
            );
            return null;
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (!Device.isDevice) {
            console.log('Must use physical device for Push Notifications');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }

        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_PROJECT_ID;
        const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = pushTokenData.data;

        await this.savePushToken(userId, token);
        await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

        return token;
    }

    /**
     * Save push token to database
     */
    async savePushToken(userId: string, token: string): Promise<void> {
        const deviceType = Platform.OS as 'ios' | 'android' | 'web';

        const { error } = await supabase
            .from('push_tokens')
            .upsert({
                user_id: userId,
                push_token: token,
                device_type: deviceType,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,push_token'
            });

        if (error) {
            console.error('Error saving push token:', error);
        }
    }

    /**
     * Remove push token when user logs out
     */
    async removePushToken(userId: string, token: string): Promise<void> {
        const { error } = await supabase
            .from('push_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('push_token', token);

        if (error) {
            console.error('Error removing push token:', error);
        }
    }

    /**
     * Remove the currently active device token from db and local storage.
     */
    async removeCurrentDevicePushToken(userId: string): Promise<void> {
        const token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);

        if (token) {
            await this.removePushToken(userId, token);
        }

        await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    }

    /**
     * Notify all home members about an item status update
     */
    async notifyItemStatusUpdate(
        homeId: string,
        senderUserId: string,
        itemId: string,
        itemName: string,
        newStatus: string,
        senderName: string
    ): Promise<void> {
        const statusLabels: Record<string, string> = {
            enough: 'Stocked',
            nearing: 'Running Low',
            finished: 'Out of Stock',
        };

        const title = `Item Update: ${itemName}`;
        const body = `${senderName} marked "${itemName}" as ${statusLabels[newStatus] || newStatus}`;

        await this.sendToHomeViaFunction(senderUserId, {
            homeId,
            title,
            body,
            type: 'status_update',
            itemId,
            itemName,
            data: {
                type: 'status_update',
                itemId,
                homeId,
            },
        });
    }

    /**
     * Notify all home members about a purchase
     */
    async notifyItemPurchase(
        homeId: string,
        senderUserId: string,
        itemId: string,
        itemName: string,
        senderName: string,
        storeName?: string
    ): Promise<void> {
        const title = `Purchase: ${itemName}`;
        const storeText = storeName ? ` from ${storeName}` : '';
        const body = `${senderName} purchased "${itemName}"${storeText}`;

        await this.sendToHomeViaFunction(senderUserId, {
            homeId,
            title,
            body,
            type: 'purchase',
            itemId,
            itemName,
            data: {
                type: 'purchase',
                itemId,
                homeId,
            },
        });
    }

    /**
     * Notify all home members about a new item added
     */
    async notifyItemAdded(
        homeId: string,
        senderUserId: string,
        itemId: string,
        itemName: string,
        senderName: string
    ): Promise<void> {
        const title = `New Item: ${itemName}`;
        const body = `${senderName} added "${itemName}" to the inventory`;

        await this.sendToHomeViaFunction(senderUserId, {
            homeId,
            title,
            body,
            type: 'item_added',
            itemId,
            itemName,
            data: {
                type: 'item_added',
                itemId,
                homeId,
            },
        });
    }

    /**
     * Notify all home members about an item deletion
     */
    async notifyItemDeleted(
        homeId: string,
        senderUserId: string,
        itemName: string,
        senderName: string
    ): Promise<void> {
        const title = 'Item Deleted';
        const body = `${senderName} removed "${itemName}" from the inventory`;

        await this.sendToHomeViaFunction(senderUserId, {
            homeId,
            title,
            body,
            type: 'item_deleted',
            itemName,
            data: {
                type: 'item_deleted',
                homeId,
            },
        });
    }

    /**
     * Dispatch push + in-app notifications via server-side function.
     */
    private async sendToHomeViaFunction(senderUserId: string, payload: SendToHomePayload): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            console.error('send-home-notification: no active session, skipping');
            return;
        }

        const { error } = await supabase.functions.invoke('send-home-notification', {
            body: {
                senderUserId,
                ...payload,
            },
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });

        if (error) {
            console.error('Error invoking send-home-notification:', error);
        }
    }

    /**
     * Get unread notifications count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error fetching unread count:', error);
            return 0;
        }

        return count || 0;
    }

    /**
     * Get notifications for a user
     */
    async getNotifications(userId: string, limit: number = 50): Promise<HomeNotification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }

        return (data || []) as HomeNotification[];
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    /**
     * Register listeners for incoming notifications and notification taps.
     *
     * The global `Notifications.setNotificationHandler(...)` (which controls
     * foreground banner/sound/badge behavior) is now registered once at app
     * startup in `App.tsx` rather than here, per Expo's recommendation — that
     * ensures foreground alerts work pre-login and on cold launch.
     *
     * This method now only manages the two event listeners and should be called
     * once when a user logs in (and cleaned up on logout). In Expo Go the
     * listener setup is skipped because remote notifications are unavailable.
     */
    setNotificationHandler(
        onNotificationReceived?: (notification: Notification) => void,
        onNotificationResponse?: (response: NotificationResponse) => void
    ): () => void {
        this.clearNotificationSubscriptions();

        if (isExpoGo) {
            // No-op for listeners in Expo Go — they require a native module
            // that isn't available. Returning a noop cleanup is fine.
            return () => {
                this.clearNotificationSubscriptions();
            };
        }

        if (onNotificationReceived) {
            this.notificationSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
        }

        if (onNotificationResponse) {
            this.responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
        }

        return () => {
            this.clearNotificationSubscriptions();
        };
    }

    private clearNotificationSubscriptions(): void {
        if (this.notificationSubscription) {
            this.notificationSubscription.remove();
            this.notificationSubscription = null;
        }

        if (this.responseSubscription) {
            this.responseSubscription.remove();
            this.responseSubscription = null;
        }
    }
}

export const notificationService = new NotificationService();