import { describe, it, expect, beforeEach } from 'vitest';
import { __resetSystemColorScheme } from './stubs/react-native';

// `react-native` is routed to our stub via resolve.alias in vitest.config.ts,
// so useThemeStore's `Appearance.getColorScheme()` reads the stub's scheme.
// We drive state explicitly via setThemeMode/syncSystemTheme in each test.
import { useThemeStore } from '../store/useThemeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    __resetSystemColorScheme('light');
    useThemeStore.setState({
      themeMode: 'system',
      effectiveTheme: 'light',
    });
  });

  it('setThemeMode resolves to an explicit light theme', () => {
    __resetSystemColorScheme('dark'); // system is dark, but we pick light
    useThemeStore.getState().setThemeMode('light');
    expect(useThemeStore.getState().themeMode).toBe('light');
    expect(useThemeStore.getState().effectiveTheme).toBe('light');
  });

  it('setThemeMode resolves to an explicit dark theme', () => {
    __resetSystemColorScheme('light'); // system is light, but we pick dark
    useThemeStore.getState().setThemeMode('dark');
    expect(useThemeStore.getState().themeMode).toBe('dark');
    expect(useThemeStore.getState().effectiveTheme).toBe('dark');
  });

  it('setThemeMode("system") reads the current system scheme', () => {
    __resetSystemColorScheme('dark');
    useThemeStore.getState().setThemeMode('system');
    const state = useThemeStore.getState();
    expect(state.themeMode).toBe('system');
    expect(state.effectiveTheme).toBe('dark');
  });

  it('setThemeMode("system") falls back to light when the system scheme is null', () => {
    __resetSystemColorScheme(null);
    useThemeStore.getState().setThemeMode('system');
    expect(useThemeStore.getState().effectiveTheme).toBe('light');
  });

  it('syncSystemTheme updates effectiveTheme only when mode is system', () => {
    useThemeStore.getState().setThemeMode('light');
    __resetSystemColorScheme('dark');
    useThemeStore.getState().syncSystemTheme();
    // mode is light, so system change is ignored
    expect(useThemeStore.getState().effectiveTheme).toBe('light');

    useThemeStore.getState().setThemeMode('system');
    __resetSystemColorScheme('dark');
    useThemeStore.getState().syncSystemTheme();
    expect(useThemeStore.getState().effectiveTheme).toBe('dark');
  });
});
