import React from 'react';
import { View, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, spacing } from '../theme';

interface InviteMemberModalProps {
    visible: boolean;
    onDismiss: () => void;
    onInvite: (email: string) => void;
    loading?: boolean;
}



export function InviteMemberModal({ visible, onDismiss, onInvite, loading }: InviteMemberModalProps) {
    const theme = useTheme();

    // Use ref to store email value — avoids controlled re-renders that fight cursor position
    const emailRef = React.useRef('');
    const inputRef = React.useRef<RNTextInput>(null);

    // Only these states drive UI updates (button disabled, error text)
    const [canSubmit, setCanSubmit] = React.useState(false);
    const [showError, setShowError] = React.useState(false);

    const validateEmail = (text: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());

    // Reset input whenever modal opens
    React.useEffect(() => {
        if (visible) {
            emailRef.current = '';
            setCanSubmit(false);
            setShowError(false);
            // Clear the native input on next tick (after mount)
            setTimeout(() => inputRef.current?.clear(), 0);
        }
    }, [visible]);

    const handleChangeText = React.useCallback((text: string) => {
        emailRef.current = text;
        const valid = validateEmail(text);
        setCanSubmit(valid);
        // If user is correcting, clear the error as soon as it becomes valid
        if (valid) {
            setShowError(false);
        }
    }, []);

    const handleBlur = React.useCallback(() => {
        const text = emailRef.current;
        if (text.length > 0 && !validateEmail(text)) {
            setShowError(true);
        }
    }, []);

    const handleInvite = React.useCallback(() => {
        const trimmed = emailRef.current.trim();
        if (!trimmed || !validateEmail(trimmed)) {
            setShowError(true);
            return;
        }
        onInvite(trimmed.toLowerCase());
        emailRef.current = '';
        inputRef.current?.clear();
        setCanSubmit(false);
        setShowError(false);
    }, [onInvite]);

    const handleDismiss = React.useCallback(() => {
        emailRef.current = '';
        inputRef.current?.clear();
        setCanSubmit(false);
        setShowError(false);
        onDismiss();
    }, [onDismiss]);

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={handleDismiss}
                contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons
                            name="account-plus"
                            size={28}
                            color={theme.colors.primary}
                        />
                    </View>
                    <View style={styles.headerText}>
                        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                            Invite Member
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            Send an invitation to join your home
                        </Text>
                    </View>
                </View>

                {/* Email Input — UNCONTROLLED: no `value` prop to avoid cursor jumping */}
                <TextInput
                    ref={inputRef as any}
                    label="Email Address"
                    onChangeText={handleChangeText}
                    onBlur={handleBlur}
                    mode="outlined"
                    placeholder="member@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    left={<TextInput.Icon icon="email-outline" />}
                    error={showError}
                    style={styles.input}
                />
                <HelperText type="error" visible={showError}>
                    Please enter a valid email address
                </HelperText>

                {/* Info Card */}
                <View style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <MaterialCommunityIcons
                        name="information-outline"
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1, marginLeft: spacing.sm }}>
                        An invitation will be sent to this email. The user can accept or decline from their app.
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <Button
                        mode="outlined"
                        onPress={handleDismiss}
                        style={styles.actionButton}
                    >
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleInvite}
                        loading={loading}
                        disabled={!canSubmit || loading}
                        style={styles.actionButton}
                        icon="send"
                    >
                        Send Invite
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: {
        margin: spacing.lg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontWeight: '600',
    },
    input: {
        marginBottom: spacing.xs,
    },
    infoCard: {
        flexDirection: 'row',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'flex-start',
        marginTop: spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    actionButton: {
        flex: 1,
    },
});
