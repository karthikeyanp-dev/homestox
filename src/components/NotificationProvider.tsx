import React, { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Notifications from '../utils/notifications';
import { notificationService } from '../services/notificationService';
import { useAuthStore } from '../store/useAuthStore';
import { useHomeStore } from '../store/useHomeStore';
import { navigationRef } from '../navigation';
import type { NotificationResponse } from 'expo-notifications';

interface NotificationProviderProps {
    children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const { user } = useAuthStore();
    const { currentHome } = useHomeStore();
    const queryClient = useQueryClient();
    const pendingResponseRef = useRef<NotificationResponse | null>(null);

    // This hook also surfaces a notification that launched the app.
    const lastResponse = Notifications.useLastNotificationResponse();

    const handleResponse = useCallback((response: NotificationResponse | null) => {
        if (!response) return;

        // A notification tap should always clear the device badge, even when
        // navigation must wait for authentication or home state to hydrate.
        Notifications.setBadgeCountAsync(0).catch(() => {});

        if (!navigationRef.isReady() || !user?.id || !currentHome) {
            pendingResponseRef.current = response;
            return;
        }

        const rootRoute = navigationRef.getRootState()?.routes[0];
        if (rootRoute?.name !== 'App') {
            pendingResponseRef.current = response;
            return;
        }

        navigationRef.navigate('App', {
            screen: 'SettingsTab',
            params: { screen: 'Notifications' },
        });

        const notificationId = response.notification.request.content.data?.notificationId;
        if (typeof notificationId === 'string') {
            notificationService.markAsRead(notificationId).catch(() => {});
        }

        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        queryClient.invalidateQueries({ queryKey: ['unread-notifications', user.id] });
    }, [currentHome, queryClient, user?.id]);

    useEffect(() => {
        if (!user) return;

        notificationService.registerForPushNotifications(user.id).catch((error: Error) => {
            console.error('Failed to register push notifications:', error);
        });

        const tapSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

        return () => {
            tapSubscription.remove();
        };
    }, [handleResponse, user]);

    useEffect(() => {
        handleResponse(lastResponse ?? null);
    }, [handleResponse, lastResponse]);

    useEffect(() => {
        if (!pendingResponseRef.current) return;
        if (!navigationRef.isReady() || !user?.id || !currentHome) return;

        const response = pendingResponseRef.current;
        pendingResponseRef.current = null;
        handleResponse(response);
    }, [currentHome, handleResponse, user?.id]);

    return <>{children}</>;
}
