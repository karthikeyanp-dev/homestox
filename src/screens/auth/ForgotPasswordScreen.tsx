import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { spacing, borderRadius } from '../../theme';
import { useToastStore } from '../../store/useToastStore';
import { isValidEmail } from '../../utils/emailValidation';
import {
    AuthScreenShell,
    AuthHeader,
    AuthInput,
    GradientButton,
    useAuthEntranceAnimation,
} from './components';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const theme = useTheme();
    const navigation = useNavigation<any>();

    // 3 staggered slots: header, form, back-to-login.
    const slots = useAuthEntranceAnimation({ count: 3 });

    async function handleReset() {
        if (!isValidEmail(email)) {
            useToastStore.getState().showToast('Please enter a valid email address.', 'error');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: 'homestox://reset-password',
        });

        setLoading(false);

        if (error) {
            useToastStore.getState().showToast(error.message, 'error');
            return;
        }

        // Dedicated inline panel instead of a fleeting toast — the user must
        // go check their email, so a persistent success state is clearer.
        setSent(true);
    }

    if (sent) {
        return (
            <AuthScreenShell>
                <Animated.View style={[styles.successWrap, slots[0].style]}>
                    <View
                        style={[styles.successIcon, { backgroundColor: theme.colors.primaryContainer }]}
                    >
                        <MaterialCommunityIcons
                            name="email-check-outline"
                            size={48}
                            color={theme.colors.primary}
                        />
                    </View>
                    <Text variant="headlineSmall" style={[styles.successTitle, { color: theme.colors.onSurface }]}>
                        Check your email
                    </Text>
                    <Text variant="bodyMedium" style={[styles.successBody, { color: theme.colors.onSurfaceVariant }]}>
                        We sent a password reset link to{'\n'}
                        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                            {email.trim()}
                        </Text>
                        .{'\n\n'}Open the link to set a new password, then come back and sign in.
                    </Text>

                    <GradientButton label="Back to Sign In" onPress={() => navigation.navigate('Login')} />

                    <Pressable
                        onPress={handleReset}
                        disabled={loading}
                        style={({ pressed }) => [styles.resendLink, { opacity: pressed ? 0.6 : 1 }]}
                    >
                        <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                            {loading ? 'Sending…' : 'Resend email'}
                        </Text>
                    </Pressable>
                </Animated.View>
            </AuthScreenShell>
        );
    }

    return (
        <AuthScreenShell>
            {/* Header */}
            <Animated.View style={slots[0].style}>
                <AuthHeader
                    title="Forgot Password"
                    subtitle="Enter your email and we'll send you a link to reset your password."
                />
            </Animated.View>

            {/* Form */}
            <Animated.View style={[styles.form, slots[1].style]}>
                <AuthInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    icon="email-outline"
                    placeholder="your@email.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    valid={isValidEmail(email)}
                />

                <GradientButton
                    label="Send Reset Link"
                    onPress={handleReset}
                    loading={loading}
                    disabled={!isValidEmail(email)}
                />
            </Animated.View>

            {/* Back to login */}
            <Animated.View style={[styles.footer, slots[2].style]}>
                <Pressable
                    onPress={() => navigation.navigate('Login')}
                    style={({ pressed }) => [styles.backRow, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={18}
                        color={theme.colors.primary}
                    />
                    <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '600', marginLeft: spacing.xs }}>
                        Back to Sign In
                    </Text>
                </Pressable>
            </Animated.View>
        </AuthScreenShell>
    );
}

const styles = StyleSheet.create({
    form: {
        marginBottom: spacing.lg,
    },
    footer: {
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    successWrap: {
        alignItems: 'center',
        marginTop: spacing.xxl,
        paddingHorizontal: spacing.lg,
    },
    successIcon: {
        width: 96,
        height: 96,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    successTitle: {
        fontWeight: '800',
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    successBody: {
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    resendLink: {
        marginTop: spacing.lg,
        paddingVertical: spacing.sm,
    },
});
