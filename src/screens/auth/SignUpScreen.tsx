import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Animated,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import { useNavigation } from '@react-navigation/native';
import { spacing, borderRadius } from '../../theme';
import { useToastStore } from '../../store/useToastStore';
import { isValidEmail } from '../../utils/emailValidation';
import {
    AuthScreenShell,
    AuthHeader,
    AuthInput,
    GradientButton,
    PasswordStrengthMeter,
    useAuthEntranceAnimation,
} from './components';

// Min password length accepted at submit time. The strength meter encourages
// a stronger password, but we still enforce a floor so Supabase doesn't reject.
const MIN_PASSWORD_LENGTH = 6;

export default function SignUpScreen() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailConfirmed, setEmailConfirmed] = useState(false);
    // Debounced email so the green check only appears once typing settles,
    // not on every keystroke.
    const [emailValidDebounced, setEmailValidDebounced] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const theme = useTheme();
    const navigation = useNavigation<any>();

    // Staggered slots: header → name → email → password → button → footer → tagline.
    const slots = useAuthEntranceAnimation({ count: 7 });

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setEmailValidDebounced(isValidEmail(email));
        }, 350);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [email]);

    const fullNameValid = fullName.trim().length > 0;
    const passwordMeetsFloor = password.length >= MIN_PASSWORD_LENGTH;

    async function signUpWithEmail() {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
            useToastStore.getState().showToast('Please fill in all fields.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            useToastStore.getState().showToast('Please enter a valid email address.', 'error');
            return;
        }

        if (!passwordMeetsFloor) {
            useToastStore.getState().showToast(
                `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
                'error',
            );
            return;
        }

        setLoading(true);
        const {
            data: { session },
            error,
        } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName.trim(),
                },
            },
        });

        setLoading(false);

        if (error) {
            useToastStore.getState().showToast(error.message, 'error');
            return;
        }

        // No session means Supabase is requiring email confirmation — show a
        // dedicated inline panel (persistent, requires action) instead of a
        // fleeting toast.
        if (!session) {
            setEmailConfirmed(true);
        }
    }

    const navigateToLogin = useCallback(() => {
        navigation.navigate('Login');
    }, [navigation]);

    if (emailConfirmed) {
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
                        We sent a verification link to{'\n'}
                        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                            {email.trim()}
                        </Text>
                        .{'\n\n'}Open it to confirm your account, then sign in to start tracking your inventory.
                    </Text>

                    <GradientButton label="Back to Sign In" onPress={navigateToLogin} />
                </Animated.View>
            </AuthScreenShell>
        );
    }

    return (
        <AuthScreenShell>
            {/* Header */}
            <Animated.View style={slots[0].style}>
                <AuthHeader
                    title="Create Account"
                    subtitle="Join HomeStox and start tracking your inventory"
                />
            </Animated.View>

            {/* Full Name */}
            <Animated.View style={slots[1].style}>
                <AuthInput
                    label="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    icon="account-outline"
                    placeholder="John Doe"
                    autoCapitalize="words"
                    valid={fullNameValid}
                />
            </Animated.View>

            {/* Email */}
            <Animated.View style={slots[2].style}>
                <AuthInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    icon="email-outline"
                    placeholder="your@email.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    valid={emailValidDebounced}
                />
            </Animated.View>

            {/* Password + strength meter */}
            <Animated.View style={slots[3].style}>
                <AuthInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    icon="lock-outline"
                    placeholder="Create a password"
                    secure
                    showToggle
                    autoCapitalize="none"
                    error={password.length > 0 && !passwordMeetsFloor}
                />
                <PasswordStrengthMeter password={password} />
            </Animated.View>

            {/* Button + terms */}
            <Animated.View style={slots[4].style}>
                <GradientButton
                    label="Create Account"
                    onPress={signUpWithEmail}
                    loading={loading}
                    disabled={loading || !fullNameValid || !emailValidDebounced || !passwordMeetsFloor}
                />

                {/* Terms — rendered as plain styled text (no onPress) to avoid
                    dead 404 links until real pages / an in-app screen exist. */}
                <Text variant="bodySmall" style={[styles.termsText, { color: theme.colors.onSurfaceVariant }]}>
                    By creating an account, you agree to our{' '}
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                        Terms of Service
                    </Text>
                    {' '}and{' '}
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                        Privacy Policy
                    </Text>
                    .
                </Text>
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footer, slots[5].style]}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    Already have an account?
                </Text>
                <Pressable
                    onPress={navigateToLogin}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                    <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: spacing.xs }}>
                        Sign In
                    </Text>
                </Pressable>
            </Animated.View>

            {/* Tagline — user-benefit language, no backend vendor leak */}
            <Animated.View style={[styles.tagline, slots[6].style]}>
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
    termsText: {
        textAlign: 'center',
        lineHeight: 20,
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
    },
    tagline: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
