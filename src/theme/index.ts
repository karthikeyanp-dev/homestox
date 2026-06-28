import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// Beautiful color palette inspired by modern design systems
const lightColors = {
    primary: '#6366F1',           // Indigo
    primaryContainer: '#E0E7FF',
    secondary: '#06B6D4',         // Cyan
    secondaryContainer: '#CFFAFE',
    tertiary: '#F59E0B',          // Amber
    tertiaryContainer: '#FEF3C7',
    surface: '#FFFFFF',
    surfaceVariant: '#F8FAFC',
    background: '#F1F5F9',
    error: '#EF4444',
    errorContainer: '#FEE2E2',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#4338CA',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#0E7490',
    onSurface: '#0F172A',
    onSurfaceVariant: '#475569',
    onBackground: '#1E293B',
    outline: '#CBD5E1',
    outlineVariant: '#E2E8F0',
    inverseSurface: '#1E293B',
    inverseOnSurface: '#F8FAFC',
    inversePrimary: '#A5B4FC',
    elevation: {
        level0: 'transparent',
        level1: '#FFFFFF',
        level2: '#F8FAFC',
        level3: '#F1F5F9',
        level4: '#E2E8F0',
        level5: '#CBD5E1',
    },
    surfaceDisabled: 'rgba(15, 23, 42, 0.12)',
    onSurfaceDisabled: 'rgba(15, 23, 42, 0.38)',
    backdrop: 'rgba(15, 23, 42, 0.5)',
};

const darkColors = {
    primary: '#818CF8',           // Light Indigo
    primaryContainer: '#3730A3',
    secondary: '#22D3EE',         // Light Cyan
    secondaryContainer: '#155E75',
    tertiary: '#FBBF24',          // Light Amber
    tertiaryContainer: '#92400E',
    surface: '#1E293B',
    surfaceVariant: '#334155',
    background: '#0F172A',
    error: '#F87171',
    errorContainer: '#7F1D1D',
    onPrimary: '#1E1B4B',
    onPrimaryContainer: '#C7D2FE',
    onSecondary: '#164E63',
    onSecondaryContainer: '#A5F3FC',
    onSurface: '#F1F5F9',
    onSurfaceVariant: '#94A3B8',
    onBackground: '#E2E8F0',
    outline: '#475569',
    outlineVariant: '#334155',
    inverseSurface: '#E2E8F0',
    inverseOnSurface: '#1E293B',
    inversePrimary: '#4F46E5',
    elevation: {
        level0: 'transparent',
        level1: '#1E293B',
        level2: '#293548',
        level3: '#334155',
        level4: '#3D4A5B',
        level5: '#475569',
    },
    surfaceDisabled: 'rgba(241, 245, 249, 0.12)',
    onSurfaceDisabled: 'rgba(241, 245, 249, 0.38)',
    backdrop: 'rgba(0, 0, 0, 0.7)',
};

export const lightTheme: MD3Theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        ...lightColors,
    },
};

export const darkTheme: MD3Theme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        ...darkColors,
    },
};

// Status colors for item states
export const statusColors = {
    light: {
        enough: { bg: '#DCFCE7', text: '#166534', icon: '#22C55E' },      // Green
        nearing: { bg: '#FEF9C3', text: '#854D0E', icon: '#F59E0B' },     // Amber/Yellow
        finished: { bg: '#FEE2E2', text: '#991B1B', icon: '#EF4444' },    // Red
    },
    dark: {
        enough: { bg: '#14532D', text: '#86EFAC', icon: '#4ADE80' },
        nearing: { bg: '#713F12', text: '#FDE047', icon: '#FBBF24' },
        finished: { bg: '#7F1D1D', text: '#FCA5A5', icon: '#F87171' },
    },
};

// Common spacing values
export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// Border radius values
export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
};
