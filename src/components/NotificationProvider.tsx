import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Notifications from '../utils/notifications';
import { notificationService } from '../services/notificationService';
import { useAuthStore } from '../store/useAuthStore';

interface NotificationProviderProps {
    children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user) return;

        notificationService.registerForPushNotifications(user.id).catch((error: Error) => {
            console.error('Failed to register push notifications:', error);
        });

        // The global foreground handler (banner/sound/badge) is registered once
        // at app startup in App.tsx. Here we only attach the tap-response
        // listener so tapping a notification refreshes the relevant queries.
        const tapSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
            console.log('Notification tapped:', response.notification.request.content.data);
        });

        return () => {
            tapSubscription.remove();
        };
    }, [user, queryClient]);

    return <>{children}</>;
}
