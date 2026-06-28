import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../../theme';

// The app's own logo (assets/icon.png), shown on all auth screens for a
// consistent, app-branded header instead of a generic Material icon.
const APP_LOGO = require('../../../../assets/icon.png');

interface AuthHeaderProps {
    /** Large screen title (e.g. "Welcome Back"). */
    title: string;
    /** Supporting subtitle under the title. */
    subtitle: string;
}

/**
 * Shared auth header: the app logo in a rounded-square tile, centered title,
 * and subtitle. Used by Login, SignUp, and ForgotPassword screens for a
 * consistent, app-branded feel.
 */
export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.logoTile,
                    {
                        backgroundColor: theme.colors.primaryContainer,
                    },
                ]}
            >
                <Image
                    source={APP_LOGO}
                    style={styles.logo}
                    resizeMode="cover"
                    accessibilityLabel="HomeStox logo"
                />
            </View>

            <Text
                variant="headlineLarge"
                style={[styles.title, { color: theme.colors.onSurface }]}
            >
                {title}
            </Text>
            <Text
                variant="bodyLarge"
                style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            >
                {subtitle}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoTile: {
        width: 97,
        height: 97,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontWeight: '800',
        marginBottom: spacing.sm,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        lineHeight: 24,
    },
});
