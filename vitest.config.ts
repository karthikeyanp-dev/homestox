import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Lightweight stubs for React Native modules so source files that import
// `react-native`, `@react-native-async-storage/async-storage`, or
// `react-native-url-polyfill/auto` can be loaded under Vitest's Node/jsdom
// runner without the native runtime.
const stub = (id: string) =>
  fileURLToPath(new URL(`./src/__tests__/stubs/${id}.ts`, import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      'react-native': stub('react-native'),
      '@react-native-async-storage/async-storage': stub('async-storage'),
      'react-native-url-polyfill/auto': stub('url-polyfill-auto'),
    },
  },
});
