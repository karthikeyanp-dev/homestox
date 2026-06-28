import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface AuthInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    /** Leading icon name. */
    icon: IconName;
    /** Placeholder shown when empty. */
    placeholder?: string;
    /** Mask input characters (for passwords). */
    secure?: boolean;
    /** Allow the user to toggle password visibility (only meaningful with secure). */
    showToggle?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    /** When true, shows a red outline. */
    error?: boolean;
    /** When true, shows a green check on the right (inline success). */
    valid?: boolean;
    /** Disabled state. */
    disabled?: boolean;
    style?: object;
}

/**
 * Shared filled-style auth input.
 *
 * Modern filled look: rounded-md corners, surfaceVariant background, no
 * outline, leading icon + inline label. Supports a password visibility
 * toggle and an optional green-check validity indicator for inline async
 * validation.
 */
export function AuthInput({
    label,
    value,
    onChangeText,
    icon,
    placeholder,
    secure = false,
    showToggle = false,
    autoCapitalize = 'none',
    keyboardType = 'default',
    error = false,
    valid = false,
    disabled = false,
    style,
}: AuthInputProps) {
    const theme = useTheme();
    const [visible, setVisible] = useState(false);

    const isSecure = secure && !visible;

    const rightAdornment = (() => {
        if (showToggle && secure) {
            return (
                <TextInput.Icon
                    icon={visible ? 'eye-off' : 'eye'}
                    onPress={() => setVisible((v) => !v)}
                    color={theme.colors.onSurfaceVariant}
                    forceTextInputFocus={false}
                />
            );
        }
        if (valid) {
            return (
                <TextInput.Icon
                    icon="check-circle"
                    color={theme.colors.secondary}
                    forceTextInputFocus={false}
                />
            );
        }
        return undefined;
    })();

    return (
        <TextInput
            label={label}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            secureTextEntry={isSecure}
            mode="flat"
            disabled={disabled}
            error={error}
            left={<TextInput.Icon icon={icon} color={theme.colors.onSurfaceVariant} />}
            right={rightAdornment}
            underlineColor="transparent"
            activeUnderlineColor={error ? theme.colors.error : theme.colors.primary}
            style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }, style]}
            // contentStyle is applied to the native text *after* Paper computes
            // the icon-aware left/right padding, so adding horizontal padding here
            // keeps the placeholder clear of the leading icon instead of overriding
            // that computed padding (which was causing the overlap).
            contentStyle={styles.content}
            theme={{
                colors: {
                    text: theme.colors.onSurface,
                    placeholder: theme.colors.onSurfaceVariant,
                },
            }}
        />
    );
}

const styles = StyleSheet.create({
    input: {
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    content: {
        paddingHorizontal: spacing.sm,
    },
});
