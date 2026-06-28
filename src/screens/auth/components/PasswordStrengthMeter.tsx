import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing } from '../../../theme';
import {
    evaluatePasswordStrength,
    strengthLabelColor,
    strengthLabelCopy,
} from '../../../utils/passwordStrength';

interface PasswordStrengthMeterProps {
    password: string;
}

/**
 * Real-time password strength meter for the SignUp screen.
 *
 * Renders a colored progress bar (width tracks the 0–100 score) plus a
 * 5-rule checklist (length, lowercase, uppercase, number, symbol). Hidden
 * entirely while the password is empty so it doesn't crowd an untouched form.
 */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
    const theme = useTheme();
    const result = evaluatePasswordStrength(password);

    if (result.label === 'empty') return null;

    const barColor = strengthLabelColor(result.label, {
        weak: theme.colors.error,
        fair: theme.colors.tertiary,
        good: theme.colors.secondary,
        strong: theme.colors.primary,
    });

    return (
        <View style={styles.container}>
            <View style={styles.barRow}>
                <View style={[styles.barTrack, { backgroundColor: theme.colors.outlineVariant }]} />
                <View
                    style={[
                        styles.barFill,
                        { backgroundColor: barColor, width: `${result.score}%` },
                    ]}
                />
            </View>
            <Text
                variant="labelMedium"
                style={[styles.label, { color: barColor }]}
            >
                {strengthLabelCopy(result.label)}
            </Text>

            <View style={styles.rules}>
                {result.rules.map((rule) => {
                    const iconColor = rule.passed ? theme.colors.secondary : theme.colors.onSurfaceVariant;
                    return (
                        <View key={rule.id} style={styles.ruleItem}>
                            <MaterialCommunityIcons
                                name={rule.passed ? 'check-circle' : 'circle-outline'}
                                size={14}
                                color={iconColor}
                            />
                            <Text
                                variant="bodySmall"
                                style={{ color: iconColor, marginLeft: spacing.xs }}
                            >
                                {rule.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    barRow: {
        height: 4,
        borderRadius: 2,
        marginBottom: spacing.xs,
        position: 'relative',
    },
    barTrack: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 2,
    },
    barFill: {
        height: 4,
        borderRadius: 2,
    },
    label: {
        marginBottom: spacing.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    rules: {
        gap: spacing.xs,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
