import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { analyticsService, calcUnitPrice } from '../../services/analyticsService';
import { Item, Purchase } from '../../types';
import { format } from 'date-fns';
import { borderRadius, spacing, statusColors } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';

interface PriceHistoryModalProps {
    visible: boolean;
    onDismiss: () => void;
    item: Item | null;
}

export default function PriceHistoryModal({ visible, onDismiss, item }: PriceHistoryModalProps) {
    const theme = useTheme();
    const { effectiveTheme } = useThemeStore();

    const { data: history = [], isLoading } = useQuery({
        queryKey: ['history', item?.id],
        queryFn: () => analyticsService.getPurchaseHistory(item!.id),
        enabled: !!item && visible,
    });

    const { data: bestValue } = useQuery({
        queryKey: ['bestValue', item?.id],
        queryFn: () => analyticsService.getBestValueStore(item!.id),
        enabled: !!item && visible,
    });

    // Get colors - use default if item is null
    const itemStatus = item?.status || 'enough';
    const colors = statusColors[effectiveTheme][itemStatus];

    const renderPurchaseItem = ({ item: purchase, index }: { item: Purchase; index: number }) => (
        <View style={[styles.purchaseItem, { backgroundColor: theme.colors.surfaceVariant + '50' }]}>
            <View style={styles.purchaseHeader}>
                <View style={styles.dateContainer}>
                    <MaterialCommunityIcons
                        name="calendar"
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                        {format(new Date(purchase.purchased_at), 'MMM d, yyyy')}
                    </Text>
                </View>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    ₹{purchase.price.toFixed(2)}
                </Text>
            </View>

            {/* Unit Price */}
            {purchase.quantity > 0 && (
                <View style={[styles.unitPriceBadge, { backgroundColor: theme.colors.tertiaryContainer }]}>
                    <Text variant="bodySmall" style={{ color: theme.colors.tertiary, fontWeight: '600' }}>
                        ₹{calcUnitPrice(purchase.price, purchase.quantity, purchase.unit).value.toFixed(2)}/{calcUnitPrice(purchase.price, purchase.quantity, purchase.unit).unit}
                    </Text>
                </View>
            )}

            <View style={styles.purchaseDetails}>
                <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="store" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
                        {purchase.store_name || 'Unknown store'}
                    </Text>
                </View>
                {purchase.brand && (
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="tag" size={14} color={theme.colors.onSurfaceVariant} />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
                            {purchase.brand}
                        </Text>
                    </View>
                )}
                <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="package-variant" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
                        {purchase.quantity} {purchase.unit}
                    </Text>
                </View>
            </View>

            {/* Rating Stars */}
            <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialCommunityIcons
                        key={star}
                        name={star <= purchase.rating ? "star" : "star-outline"}
                        size={16}
                        color={star <= purchase.rating ? '#F59E0B' : theme.colors.outline}
                    />
                ))}
            </View>
        </View>
    );

    return (
        <Portal>
            <Modal
                visible={visible && item !== null}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
            >
                {item && (
                    <>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={[styles.iconBadge, { backgroundColor: colors.bg }]}>
                                <MaterialCommunityIcons
                                    name="history"
                                    size={24}
                                    color={colors.icon}
                                />
                            </View>
                            <View style={styles.headerText}>
                                <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Purchase History
                                </Text>
                                <Text variant="titleLarge" style={[styles.itemName, { color: theme.colors.onSurface }]}>
                                    {item.name}
                                </Text>
                            </View>
                        </View>

                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                            </View>
                        ) : (
                            <>
                                {/* Best Value Card */}
                                {bestValue && (
                                    <View style={[styles.bestValueCard, { backgroundColor: theme.colors.secondaryContainer }]}>
                                        <View style={styles.bestValueIcon}>
                                            <MaterialCommunityIcons
                                                name="trophy"
                                                size={28}
                                                color={theme.colors.secondary}
                                            />
                                        </View>
                                        <View style={styles.bestValueContent}>
                                            <Text variant="titleSmall" style={{ color: theme.colors.onSecondaryContainer, fontWeight: '600' }}>
                                                Best Unit Price!
                                            </Text>
                                            <Text variant="bodyMedium" style={{ color: theme.colors.onSecondaryContainer }}>
                                                ₹{calcUnitPrice(bestValue.price, bestValue.quantity, bestValue.unit).value.toFixed(2)}/{calcUnitPrice(bestValue.price, bestValue.quantity, bestValue.unit).unit} at {bestValue.store_name}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* History List */}
                                {history.length > 0 ? (
                                    <FlatList
                                        data={history}
                                        keyExtractor={(historyItem) => historyItem.id}
                                        renderItem={renderPurchaseItem}
                                        contentContainerStyle={styles.listContent}
                                        showsVerticalScrollIndicator={false}
                                        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                                    />
                                ) : (
                                    <View style={styles.emptyContainer}>
                                        <MaterialCommunityIcons
                                            name="cart-off"
                                            size={48}
                                            color={theme.colors.onSurfaceVariant}
                                        />
                                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
                                            No purchase history yet
                                        </Text>
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                                            Purchase this item to start tracking prices and find the best deals.
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}

                        <Button
                            mode="contained"
                            onPress={onDismiss}
                            style={styles.closeButton}
                        >
                            Close
                        </Button>
                    </>
                )}
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        margin: spacing.md,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    iconBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        marginLeft: spacing.md,
    },
    itemName: {
        fontWeight: '600',
    },
    loadingContainer: {
        paddingVertical: spacing.xxl,
        alignItems: 'center',
    },
    bestValueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
    },
    bestValueIcon: {
        marginRight: spacing.md,
    },
    bestValueContent: {
        flex: 1,
    },
    listContent: {
        paddingBottom: spacing.md,
    },
    purchaseItem: {
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    purchaseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    purchaseDetails: {
        gap: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 2,
        marginTop: spacing.sm,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    closeButton: {
        marginTop: spacing.md,
    },
    unitPriceBadge: {
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
        marginTop: spacing.xs,
    },
});
