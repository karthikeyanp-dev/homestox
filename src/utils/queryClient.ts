import { QueryClient } from '@tanstack/react-query';

/**
 * The app's single QueryClient.
 *
 * Defined here rather than inside App.tsx so that non-React code — the auth
 * store in particular — can clear the cache on sign-out and account deletion.
 * Without that, cached rows from the previous session stay in memory and the
 * next user to sign in on the same device briefly sees the previous user's
 * homes and items before the refetch lands.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});
