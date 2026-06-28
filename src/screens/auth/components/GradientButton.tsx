import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../../theme';

interface GradientButtonProps {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
}

/**
 * Shared gradient primary button: a diagonal primary→secondary gradient,
 * a soft shadow, and a gentle press scale (spring to 0.98) for tactile
 * feedback. Shows an inline spinner while loading.
 */
export function GradientButton({
    label,
    onPress,
    loading = false,
    disabled = false,
}: GradientButtonProps) {
    const theme = useTheme();
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.98,
            speed: 40,
            bounciness: 8,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            speed: 40,
            bounciness: 8,
            useNativeDriver: true,
        }).start();
    };

    const isDisabled = disabled || loading;

    return (
        <Animated.View
            style={[
                styles.wrapper,
                {
                    transform: [{ scale }],
                    opacity: isDisabled ? 0.6 : 1,
                },
            ]}
        >
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isDisabled}
                style={styles.pressable}
            >
                <LinearGradient
                    colors={[theme.colors.primary, theme.colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.gradient,
                        !isDisabled && styles.gradientShadow,
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color={theme.colors.onPrimary} />
                    ) : (
                        <Text
                            variant="titleMedium"
                            style={[styles.label, { color: theme.colors.onPrimary }]}
                        >
                            {label}
                        </Text>
                    )}
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        marginTop: spacing.md,
    },
    pressable: {
        width: '100%',
    },
    gradient: {
        height: 52,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    label: {
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});
