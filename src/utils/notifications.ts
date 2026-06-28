import { isRunningInExpoGo } from 'expo';

/**
 * Safe accessor for `expo-notifications`.
 *
 * Importing `expo-notifications` directly runs a top-level side effect
 * (`DevicePushTokenAutoRegistration.fx` → `addPushTokenListener()`), and as of
 * SDK 53 that side effect THROWS on Android when running inside Expo Go:
 *
 *   "expo-notifications: Android Push notifications ... was removed from Expo Go
 *    with the release of SDK 53. Use a development build instead of Expo Go."
 *
 * Because the crash happens at *import* time, guarding individual API calls is
 * not enough — the module must never be loaded in Expo Go. This wrapper lazily
 * `require`s the real module only outside Expo Go, and returns a no-op stub
 * inside Expo Go (where remote push notifications are unsupported anyway).
 *
 * Always import `expo-notifications` through this module:
 *   import Notifications from '../utils/notifications';
 */
type NotificationsModule = typeof import('expo-notifications');

function createExpoGoStub(): NotificationsModule {
    const noopSubscription = { remove: () => {} };
    const deniedPermission = {
        status: 'undetermined',
        granted: false,
        canAskAgain: true,
        expires: 'never',
    };

    const stub = {
        setNotificationHandler: () => {},
        addNotificationReceivedListener: () => noopSubscription,
        addNotificationResponseReceivedListener: () => noopSubscription,
        setNotificationChannelAsync: async () => null,
        getPermissionsAsync: async () => deniedPermission,
        requestPermissionsAsync: async () => deniedPermission,
        getExpoPushTokenAsync: async () => ({ data: '', type: 'expo' }),
        AndroidImportance: {
            UNSPECIFIED: -1000,
            NONE: 0,
            MIN: 1,
            LOW: 2,
            DEFAULT: 3,
            HIGH: 4,
            MAX: 5,
        },
    };

    return stub as unknown as NotificationsModule;
}

const Notifications: NotificationsModule = isRunningInExpoGo()
    ? createExpoGoStub()
    : (require('expo-notifications') as NotificationsModule);

export default Notifications;
