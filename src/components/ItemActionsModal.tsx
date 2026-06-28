import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Modal, Portal, Text, Button, IconButton, useTheme, Divider, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Item, ITEM_CATEGORIES } from '../types';
import { borderRadius, spacing, statusColors } from '../theme';
import { useThemeStore } from '../store/useThemeStore';
import { useHomeStore } from '../store/useHomeStore';
import { analyticsService } from '../services/analyticsService';
import { useQueryClient } from '@tanstack/react-query';

interface ItemActionsModalProps {
    visible: boolean;
    onDismiss: () => void;
    item: Item | null;
    onUpdateStatus: (status: Item['status']) => void;
    onDelete: () => void;
    onToggleRequired?: (notRequired: boolean) => void;
    onEdit?: () => void;
    loading?: boolean;
}

export function ItemActionsModal({
    visible,
    onDismiss,
    item,
    onUpdateStatus,
    onDelete,
    onToggleRequired,
    onEdit,
    loading,
}: ItemActionsModalProps) {
    const theme = useTheme();
    const { effectiveTheme } = useThemeStore();
    const { currentHome } = useHomeStore();
    const queryClient = useQueryClient();
    const [confirmDelete, setConfirmDelete] = React.useState(false);
    const [hasPurchases, setHasPurchases] = useState(false);
    const [purchaseCount, setPurchaseCount] = useState(0);
    const [lastPurchaseId, setLastPurchaseId] = useState<string | null>(null);
    const [currentRating, setCurrentRating] = useState<number>(0);
    const [lastPurchaseStore, setLastPurchaseStore] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setConfirmDelete(false);
        }
    }, [visible, item]);

    // Check for purchase history when item changes
    useEffect(() => {
        if (item) {
            analyticsService.getPurchaseCount(item.id).then(count => {
                setPurchaseCount(count);
                setHasPurchases(count > 0);
            }).catch(() => {
                setPurchaseCount(0);
                setHasPurchases(false);
            });
        } else {
            setPurchaseCount(0);
            setHasPurchases(false);
        }
    }, [item?.id]);

    // Fetch purchase data when item changes (before modal opens for faster loading)
    useEffect(() => {
        if (item) {
            analyticsService.getLatestPurchase(item.id).then(purchase => {
                if (purchase) {
                    setLastPurchaseId(purchase.id);
                    setCurrentRating(purchase.rating || 0);
                    setLastPurchaseStore(purchase.store_name || null);
                } else {
                    setLastPurchaseId(null);
                    setCurrentRating(0);
                    setLastPurchaseStore(null);
                }
            }).catch(() => {
                setLastPurchaseId(null);
                setCurrentRating(0);
                setLastPurchaseStore(null);
            });
        }
    }, [item?.id]);

    if (!item) return null;

    const colors = statusColors[effectiveTheme][item.status];
    const isNotRequired = item.not_required === true;
    const categoryInfo = ITEM_CATEGORIES.find(c => c.value === item.category);

    const handleDismiss = () => {
        setConfirmDelete(false);
        setLastPurchaseId(null);
        setCurrentRating(0);
        setLastPurchaseStore(null);
        setHasPurchases(false);
        setPurchaseCount(0);
        onDismiss();
    };

    const handleRatingPress = async (rating: number) => {
        if (!lastPurchaseId) return;
        setCurrentRating(rating);
        try {
            await analyticsService.updatePurchaseRating(lastPurchaseId, rating);
            // Invalidate all relevant queries to refresh the data everywhere
            queryClient.invalidateQueries({ queryKey: ['inventory', currentHome?.id] });
            queryClient.invalidateQueries({ queryKey: ['recentPurchases', currentHome?.id] });
            queryClient.invalidateQueries({ queryKey: ['purchaseHistory', item?.id] });
            queryClient.invalidateQueries({ queryKey: ['history', item?.id] });
        } catch (error) {
            // Revert the rating on error
            setCurrentRating(currentRating);
        }
    };

    const statusOptions: Array<{ status: Item['status']; label: string; icon: string; color: string }> = [
        { status: 'enough', label: 'Stocked', icon: 'check-circle', color: '#22C55E' },
        { status: 'nearing', label: 'Low', icon: 'alert-circle', color: '#F59E0B' },
        { status: 'finished', label: 'Out', icon: 'close-circle', color: '#EF4444' },
    ];

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={handleDismiss}
                contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
            >
                {/* Compact Header */}
                <View style={styles.header}>
                    <View style={[styles.iconBadge, { backgroundColor: colors.bg }]}>
                        <MaterialCommunityIcons
                            name={(categoryInfo?.icon || 'basket-outline') as any}
                            size={24}
                            color={colors.icon}
                        />
                    </View>
                    <View style={styles.headerText}>
                        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                    </View>
                    {onEdit && (
                        <IconButton
                            icon="pencil-outline"
                            size={20}
                            iconColor={theme.colors.onSurfaceVariant}
                            onPress={onEdit}
                            style={styles.editIcon}
                        />
                    )}
                    <IconButton
                        icon="close"
                        size={20}
                        iconColor={theme.colors.onSurfaceVariant}
                        onPress={handleDismiss}
                        style={styles.closeIcon}
                    />
                </View>

                {/* Brand Rating Section */}
                {lastPurchaseId && (item.current_brand || item.last_store || lastPurchaseStore) && (
                    <View style={styles.brandRatingCard}>
                        <View style={styles.brandHeader}>
                            <MaterialCommunityIcons
                                name="tag-outline"
                                size={16}
                                color={theme.colors.primary}
                            />
                            <Text variant="bodySmall" style={[styles.brandLabel, { color: theme.colors.primary }]}>
                                Current Brand
                            </Text>
                        </View>
                        <Text variant="titleMedium" style={[styles.brandName, { color: theme.colors.onSurface }]}>
                            {item.current_brand || item.last_store || lastPurchaseStore}
                        </Text>
                        <View style={styles.ratingContainer}>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.xs }}>
                                How would you rate this brand?
                            </Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Pressable
                                        key={star}
                                        onPress={() => handleRatingPress(star)}
                                        hitSlop={8}
                                        style={styles.starButton}
                                    >
                                        <MaterialCommunityIcons
                                            name={star <= currentRating ? "star" : "star-outline"}
                                            size={28}
                                            color={star <= currentRating ? '#F59E0B' : theme.colors.outline}
                                        />
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                <Divider style={styles.divider} />

                {/* Compact Status Selector */}
                <View style={styles.statusRow}>
                    {statusOptions.map(({ status, label, icon, color }) => (
                        <Pressable
                            key={status}
                            onPress={() => onUpdateStatus(status)}
                            style={[
                                styles.statusChip,
                                {
                                    backgroundColor: item.status === status ? color : theme.colors.surfaceVariant,
                                    borderColor: color,
                                    borderWidth: item.status === status ? 0 : 1,
                                }
                            ]}
                        >
                            <MaterialCommunityIcons
                                name={icon as any}
                                size={16}
                                color={item.status === status ? '#fff' : color}
                            />
                            <Text
                                variant="bodySmall"
                                style={{
                                    color: item.status === status ? '#fff' : color,
                                    fontWeight: '600',
                                    marginLeft: spacing.xs,
                                }}
                            >
                                {label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Divider style={styles.divider} />

                {/* Compact Skip Toggle */}
                {onToggleRequired && (
                    <Pressable
                        style={styles.skipRow}
                        onPress={() => onToggleRequired(!isNotRequired)}
                    >
                        <View style={styles.skipContent}>
                            <MaterialCommunityIcons
                                name={isNotRequired ? "minus-circle" : "minus-circle-outline"}
                                size={18}
                                color={isNotRequired ? theme.colors.primary : theme.colors.onSurfaceVariant}
                            />
                            <Text
                                variant="bodyMedium"
                                style={{
                                    color: theme.colors.onSurface,
                                    marginLeft: spacing.sm,
                                    fontWeight: '500',
                                }}
                            >
                                Skip from Shopping
                            </Text>
                        </View>
                        <Switch
                            value={isNotRequired}
                            onValueChange={(value) => onToggleRequired(value)}
                            color={theme.colors.primary}
                        />
                    </Pressable>
                )}

                <Divider style={styles.divider} />

                {/* Footer Actions - Always Visible */}
                {!confirmDelete ? (
                    <View style={styles.footerRow}>
                        <IconButton
                            icon="delete-outline"
                            size={18}
                            iconColor={theme.colors.error}
                            onPress={() => setConfirmDelete(true)}
                            style={[styles.deleteIconBtn, { borderColor: theme.colors.error }]}
                        />
                        <Button
                            mode="contained"
                            onPress={handleDismiss}
                            style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}
                            labelStyle={{ fontWeight: '600' }}
                        >
                            Done
                        </Button>
                    </View>
                ) : hasPurchases ? (
                    <View style={styles.confirmDelete}>
                        <View style={styles.warningHeader}>
                            <MaterialCommunityIcons
                                name="alert-circle-outline"
                                size={20}
                                color={theme.colors.error}
                            />
                            <Text variant="bodySmall" style={{ color: theme.colors.error, fontWeight: '600' }}>
                                Item has purchase history
                            </Text>
                        </View>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }}>
                            This item has {purchaseCount} purchase record{purchaseCount !== 1 ? 's' : ''}. Deleting will remove all purchase history. Consider using "Skip" to hide it from shopping instead.
                        </Text>
                        <View style={styles.confirmActions}>
                            <Button
                                mode="outlined"
                                onPress={() => setConfirmDelete(false)}
                                style={{ flex: 1 }}
                                compact
                            >
                                Cancel
                            </Button>
                            {onToggleRequired && (
                                <Button
                                    mode="outlined"
                                    onPress={() => {
                                        onToggleRequired(true);
                                        handleDismiss();
                                    }}
                                    style={{ flex: 1 }}
                                    textColor={theme.colors.primary}
                                    compact
                                >
                                    Skip
                                </Button>
                            )}
                            <Button
                                mode="contained"
                                onPress={onDelete}
                                buttonColor={theme.colors.error}
                                style={{ flex: 1 }}
                                loading={loading}
                                compact
                            >
                                Delete
                            </Button>
                        </View>
                    </View>
                ) : (
                    <View style={styles.confirmDelete}>
                        <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: spacing.sm }}>
                            Delete this item?
                        </Text>
                        <View style={styles.confirmActions}>
                            <Button
                                mode="outlined"
                                onPress={() => setConfirmDelete(false)}
                                style={{ flex: 1 }}
                                compact
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={onDelete}
                                buttonColor={theme.colors.error}
                                style={{ flex: 1 }}
                                loading={loading}
                                compact
                            >
                                Delete
                            </Button>
                        </View>
                    </View>
                )}
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: {
        margin: spacing.lg,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    iconBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    title: {
        fontWeight: '600',
    },
    closeIcon: {
        margin: 0,
    },
    editIcon: {
        margin: 0,
    },
    statusRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    statusChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    starsRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    divider: {
        marginVertical: spacing.sm,
    },
    skipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
    },
    skipContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    deleteIconBtn: {
        borderWidth: 1,
        borderRadius: borderRadius.md,
        margin: 0,
    },
    doneButton: {
        flex: 1,
    },
    confirmDelete: {
        padding: spacing.sm,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: borderRadius.md,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    confirmActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    brandRatingCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md * 0.6,
        marginBottom: spacing.md,
    },
    brandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    brandLabel: {
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    brandName: {
        fontWeight: '700',
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    ratingContainer: {
        alignItems: 'center',
    },
    starButton: {
        padding: spacing.xs,
    },
});
