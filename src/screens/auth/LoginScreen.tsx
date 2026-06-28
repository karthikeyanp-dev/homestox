import React, { useState, useCallback } from 'react';
import { StyleSheet, Pressable, Animated } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { useToastStore } from '../../store/useToastStore';
import {
    AuthScreenShell,
    AuthHeader,
    AuthInput,
    GradientButton,
    useAuthEntranceAnimation,
} from './components';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const theme = useTheme();
    const navigation = useNavigation<any>();

    // Staggered slots: header → email → password → button → footer → tagline.
    const slots = useAuthEntranceAnimation({ count: 6 });

    async function signInWithEmail() {
        if (!email.trim() || !password.trim()) {
            useToastStore.getState().showToast('Please enter both email and password.', 'error');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) useToastStore.getState().showToast(error.message, 'error');
        setLoading(false);
    }

    const navigateToSignUp = useCallback(() => {
        navigation.navigate('SignUp');
    }, [navigation]);

    const navigateToForgotPassword = useCallback(() => {
        navigation.navigate('ForgotPassword');
    }, [navigation]);

    return (
        <AuthScreenShell>
            {/* Header */}
            <Animated.View style={slots[0].style}>
                <AuthHeader
                    title="Welcome Back"
                    subtitle="Sign in to manage your home inventory"
                />
            </Animated.View>

            {/* Email */}
            <Animated.View style={slots[1].style}>
                <AuthInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    icon="email-outline"
                    placeholder="your@email.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
            </Animated.View>

            {/* Password */}
            <Animated.View style={slots[2].style}>
                <AuthInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    icon="lock-outline"
                    placeholder="Enter your password"
                    secure
                    showToggle
                    autoCapitalize="none"
                />
            </Animated.View>

            {/* Forgot password + Sign in */}
            <Animated.View style={slots[3].style}>
                <Pressable
                    onPress={navigateToForgotPassword}
                    style={({ pressed }) => [styles.forgotPassword, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                        Forgot password?
                    </Text>
                </Pressable>

                <GradientButton
                    label="Sign In"
                    onPress={signInWithEmail}
                    loading={loading}
                    disabled={loading || !email.trim() || !password.trim()}
                />
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footer, slots[4].style]}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    Don't have an account?
                </Text>
                <Pressable
                    onPress={navigateToSignUp}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                    <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: spacing.xs }}>
                        Create Account
                    </Text>
                </Pressable>
            </Animated.View>

            {/* Tagline — user-benefit language, no backend vendor leak */}
            <Animated.View style={[styles.tagline, slots[5].style]}>
                <MaterialCommunityIcons
                    name="shield-lock-outline"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: spacing.xs }}>
                    Your inventory stays private to your home
                </Text>
            </Animated.View>
        </AuthScreenShell>
    );
}

const styles = StyleSheet.create({
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: spacing.sm,
        paddingVertical: spacing.xs,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.lg,
    },
    tagline: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
