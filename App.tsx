import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Appearance, AppState, AppStateStatus } from 'react-native';
import Notifications from './src/utils/notifications';
import AppNavigator from './src/navigation';

// Register the notification handler at module scope so it is active BEFORE any
// component mounts. This guarantees foreground alerts (banner + sound) work
// even pre-login and on cold launch from a notification tap. Expo recommends
// setting this at the top level rather than inside a component lifecycle.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
import { useThemeStore } from './src/store/useThemeStore';
import { lightTheme, darkTheme } from './src/theme';
import { NotificationProvider } from './src/components/NotificationProvider';
import { GlobalUI } from './src/components/GlobalUI';

// Refetch all stale queries when the app comes to foreground
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

function ThemedApp() {
  const { effectiveTheme, syncSystemTheme } = useThemeStore();

  useEffect(() => {
    // Sync on mount
    syncSystemTheme();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(() => {
      syncSystemTheme();
    });

    return () => subscription.remove();
  }, []);

  const theme = effectiveTheme === 'dark' ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <NotificationProvider>
        <AppNavigator />
        <GlobalUI />
      </NotificationProvider>
    </PaperProvider>
  );
}

export default function App() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemedApp />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
