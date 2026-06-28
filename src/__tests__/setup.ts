// Global Vitest setup.
//
// React Native modules are stubbed via resolve.alias in vitest.config.ts
// rather than vi.mock() here, so the stubs apply transitively to any
// file imported during the test run (including src/utils/supabase.ts).
//
// Add shared test-wide setup (e.g. vi.mock for native modules that need
// behavior, afterEach(cleanup)) here as the test suite grows.

// Provide placeholder Supabase credentials so `createClient` in
// src/utils/supabase.ts initializes without throwing when no real env is
// present. No network calls are made during unit tests of pure logic.
// Real values from the environment take precedence if available.
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export {};
