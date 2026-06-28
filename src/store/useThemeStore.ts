import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';
type EffectiveTheme = 'light' | 'dark';

// Normalizes RN's ColorSchemeName (which includes 'unspecified'/null/undefined on RN 0.83+)
// down to a concrete 'light' | 'dark' value.
function getSystemTheme(): EffectiveTheme {
    const scheme = Appearance.getColorScheme();
    return scheme === 'dark' ? 'dark' : 'light';
}

interface ThemeState {
    themeMode: ThemeMode;
    effectiveTheme: EffectiveTheme;
    setThemeMode: (mode: ThemeMode) => void;
    syncSystemTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            themeMode: 'system',
            effectiveTheme: getSystemTheme(),

            setThemeMode: (mode: ThemeMode) => {
                const effectiveTheme = mode === 'system' ? getSystemTheme() : mode;
                set({ themeMode: mode, effectiveTheme });
            },

            syncSystemTheme: () => {
                const { themeMode } = get();
                if (themeMode === 'system') {
                    set({ effectiveTheme: getSystemTheme() });
                }
            },
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                // After rehydration, sync the effective theme with current system theme
                // This ensures that if themeMode is 'system', we use the CURRENT system theme
                // not the stale effectiveTheme value from storage
                if (state && state.themeMode === 'system') {
                    state.effectiveTheme = getSystemTheme();
                }
            },
        }
    )
);
