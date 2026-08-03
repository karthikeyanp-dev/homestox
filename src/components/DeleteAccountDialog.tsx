import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
    Text,
    Button,
    Dialog,
    Portal,
    TextInput,
    ActivityIndicator,
    useTheme,
} from 'react-native-paper';
import { accountService, AccountDeletionImpact } from '../services/accountService';
import { spacing } from '../theme';

const CONFIRMATION_WORD = 'DELETE';

interface DeleteAccountDialogProps {
    visible: boolean;
    userId: string;
    onDismiss: () => void;
    onConfirm: () => Promise<void>;
}

/**
 * Two-gate confirmation for permanent account deletion.
 *
 * Gate one is informational: we fetch what the deletion will actually do to
 * this user's homes and say so in specific terms, because "your data will be
 * deleted" gives someone in a shared home no way to know their housemates are
 * about to lose the shared inventory too.
 *
 * Gate two is the typed confirmation word, which makes the action deliberate
 * rather than a mis-tap in a settings list.
 */
export function DeleteAccountDialog({
    visible,
    userId,
    onDismiss,
    onConfirm,
}: DeleteAccountDialogProps) {
    const theme = useTheme();
    const [impact, setImpact] = useState<AccountDeletionImpact | null>(null);
    const [loadingImpact, setLoadingImpact] = useState(false);
    const [impactError, setImpactError] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [impactAttempt, setImpactAttempt] = useState(0);

    useEffect(() => {
        if (!visible) {
            setConfirmationText('');
            setImpact(null);
            setImpactError(false);
            setImpactAttempt(0);
            return;
        }

        let cancelled = false;
        setLoadingImpact(true);
        setImpactError(false);

        accountService
            .getDeletionImpact(userId)
            .then((result) => {
                if (!cancelled) setImpact(result);
            })
            .catch(() => {
                // Non-fatal: the dialog still works, it just falls back to the
                // generic warning. The Edge Function re-derives all of this
                // server-side regardless of what we managed to show here.
                if (!cancelled) setImpactError(true);
            })
            .finally(() => {
                if (!cancelled) setLoadingImpact(false);
            });

        return () => {
            cancelled = true;
        };
    }, [visible, userId, impactAttempt]);

    const handleConfirm = async () => {
        setDeleting(true);
        try {
            await onConfirm();
        } finally {
            setDeleting(false);
        }
    };

    const canConfirm =
        confirmationText.trim().toUpperCase() === CONFIRMATION_WORD && !deleting && !loadingImpact;

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={deleting ? undefined : onDismiss} dismissable={!deleting}>
                <Dialog.Icon icon="alert-circle-outline" color={theme.colors.error} />
                <Dialog.Title style={styles.title}>Delete Account</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                        This permanently deletes your account, your profile, and your purchase
                        history. It cannot be undone.
                    </Text>

                    {loadingImpact && (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" />
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                Checking your homes…
                            </Text>
                        </View>
                    )}

                    {impact && impact.homesToDelete.length > 0 && (
                        <View style={[styles.calloutBox, { backgroundColor: theme.colors.errorContainer }]}>
                            <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
                                You are the only member of{' '}
                                <Text style={styles.bold}>{impact.homesToDelete.join(', ')}</Text>.{' '}
                                {impact.homesToDelete.length > 1 ? 'These homes' : 'This home'} and all
                                {impact.homesToDelete.length > 1 ? ' their' : ' its'} items, shopping
                                lists and price history will be deleted too.
                            </Text>
                        </View>
                    )}

                    {impact && impact.homesToTransfer.length > 0 && (
                        <View style={[styles.calloutBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                You are the owner of{' '}
                                <Text style={styles.bold}>{impact.homesToTransfer.join(', ')}</Text>.
                                Ownership will pass to the longest-standing member so the rest of your
                                household keeps access.
                            </Text>
                        </View>
                    )}

                    {impactError && (
                        <View style={[styles.calloutBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                We could not load your home details. Any home where you are the only
                                member will still be deleted along with your account.
                            </Text>
                            {/* Worth retrying rather than pushing on blind: a shared-home
                                owner deserves to see what their household loses. */}
                            <Button
                                mode="text"
                                compact
                                onPress={() => setImpactAttempt((attempt) => attempt + 1)}
                                disabled={deleting || loadingImpact}
                                style={styles.retryButton}
                            >
                                Retry
                            </Button>
                        </View>
                    )}

                    <Text
                        variant="bodyMedium"
                        style={[styles.prompt, { color: theme.colors.onSurface }]}
                    >
                        Type <Text style={styles.bold}>{CONFIRMATION_WORD}</Text> to confirm.
                    </Text>

                    <TextInput
                        mode="outlined"
                        value={confirmationText}
                        onChangeText={setConfirmationText}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        disabled={deleting}
                        placeholder={CONFIRMATION_WORD}
                        accessibilityLabel={`Type ${CONFIRMATION_WORD} to confirm account deletion`}
                    />
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        onPress={handleConfirm}
                        disabled={!canConfirm}
                        loading={deleting}
                        textColor={theme.colors.error}
                    >
                        Delete Account
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}

const styles = StyleSheet.create({
    title: {
        textAlign: 'center',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    calloutBox: {
        marginTop: spacing.md,
        padding: spacing.md,
        borderRadius: 12,
    },
    retryButton: {
        alignSelf: 'flex-start',
        marginTop: spacing.xs,
        marginLeft: -spacing.sm,
    },
    prompt: {
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    bold: {
        fontWeight: '700',
    },
});
