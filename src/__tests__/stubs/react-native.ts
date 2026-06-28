// Minimal `react-native` stub for the test environment.
// Provides the surface area imported by the source code (Appearance) and a
// few harmless defaults so any transitive React Native import resolves.

type ColorScheme = 'light' | 'dark' | null;

let currentScheme: ColorScheme = 'light';

export const Appearance = {
  getColorScheme(): ColorScheme {
    return currentScheme;
  },
  setColorScheme(scheme: ColorScheme) {
    currentScheme = scheme;
  },
  addChangeListener(_listener: (preferences: { colorScheme: ColorScheme }) => void) {
    return { remove() {} };
  },
};

// Reset helper for tests that mutate the stubbed system scheme.
export function __resetSystemColorScheme(scheme: ColorScheme = 'light') {
  currentScheme = scheme;
}

// Common React Native exports that may be pulled in transitively.
export const Platform = { OS: 'web', select: (obj: Record<string, unknown>) => obj.web ?? obj.default };
export const StyleSheet = { create: <T>(styles: T) => styles };
export const View = 'View';
export const Text = 'Text';
export const TextInput = 'TextInput';
export const TouchableOpacity = 'TouchableOpacity';
export const FlatList = 'FlatList';
export const ScrollView = 'ScrollView';
export const Pressable = 'Pressable';
export const Image = 'Image';
export const SafeAreaView = 'SafeAreaView';

export default {
  Appearance,
  Platform,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  SafeAreaView,
};
