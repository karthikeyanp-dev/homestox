import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../../theme';

interface AuthScreenShellProps {
    children: React.ReactNode;
}

/**
 * Shared scaffolding for auth screens: a subtle top-to-bottom gradient
 * (primary @ ~8% → background) behind a KeyboardAvoidingView + ScrollView.
 *
 * The content is vertically centered within the available height (via
 * `flexGrow` + `justifyContent: 'center'` on the scroll content) so short
 * screens like Login sit in the middle of the device.
 *
 * Keyboard handling: `behavior` is set for BOTH platforms (iOS: 'padding',
 * Android: 'height'). Without an Android behavior the KeyboardAvoidingView
 * is a no-op there, so on edge-to-edge Android the keyboard covered the
 * focused input. With 'height', the avoidable view shrinks when the keyboard
 * opens and the inner ScrollView scrolls the focused field into view.
 */
export function AuthScreenShell({ children }: AuthScreenShellProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient
                colors={[`${theme.colors.primary}14`, theme.colors.background]}
                locations={[0, 0.35]}
                style={StyleSheet.absoluteFill}
            />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingTop: insets.top,
                            paddingBottom: insets.bottom,
                        },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    automaticallyAdjustContentInsets={false}
                    contentInsetAdjustmentBehavior="never"
                >
                    {children}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
});
