import React from 'react';
import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Item, ITEM_CATEGORIES } from '../types';
import { statusColors, borderRadius, spacing } from '../theme';
import { useThemeStore } from '../store/useThemeStore';

interface ShoppingItemProps {
    item: Item;
    onPress: (item: Item) => void;
    onInfoPress: (item: Item) => void;
    onToggleRequired?: (item: Item) => void;
    showToggleRequired?: boolean;
    toggleRequiredDisabled?: boolean;
}

interface ShoppingActionProps {
    label: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    onPress: () => void;
    accessibilityLabel: string;
    accessibilityHint: string;
    mode?: 'contained' | 'outlined' | 'text';
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
}

function ShoppingAction({
    label,
    icon,
    onPress,
    accessibilityLabel,
    accessibilityHint,
    mode = 'text',
    disabled = false,
    style,
}: ShoppingActionProps) {
    const theme = useTheme();
    const foreground = disabled
        ? theme.colors.onSurfaceDisabled
        : mode === 'contained' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant;

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled }}
            style={({ pressed }) => [
                styles.actionButton,
                {
                    backgroundColor: disabled
                        ? theme.colors.surfaceDisabled
                        : mode === 'contained' ? theme.colors.primary : 'transparent',
                    borderWidth: mode === 'outlined' ? 1 : 0,
                    borderColor: theme.colors.outlineVariant,
                    opacity: pressed ? 0.7 : 1,
                },
                style,
            ]}
        >
            <MaterialCommunityIcons name={icon} size={20} color={foreground} accessible={false} />
            <Text variant="labelLarge" style={[styles.actionLabel, { color: foreground }]}>
                {label}
            </Text>
        </Pressable>
    );
}

export function ShoppingItem({
    item,
    onPress,
    onInfoPress,
    onToggleRequired,
    showToggleRequired = false,
    toggleRequiredDisabled = false,
}: ShoppingItemProps) {
    const theme = useTheme();
    const { effectiveTheme } = useThemeStore();
    const isUrgent = item.status === 'finished';
    const isNotRequired = item.not_required === true;
    const colors = statusColors[effectiveTheme][item.status];
    const categoryInfo = ITEM_CATEGORIES.find(c => c.value === item.category);
    const statusColor = isNotRequired ? theme.colors.outline : colors.icon;

    return (
        <Surface
            style={[
                styles.card,
                { backgroundColor: isNotRequired ? theme.colors.surfaceVariant : theme.colors.surface },
            ]}
            elevation={1}
        >
            <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />
            <View style={styles.content}>
                <View style={styles.mainRow}>
                    <View style={[styles.iconContainer, { backgroundColor: statusColor + '15' }]}>
                        <MaterialCommunityIcons
                            name={(categoryInfo?.icon || 'basket-outline') as any}
                            size={20}
                            color={statusColor}
                            accessible={false}
                        />
                    </View>
                    <View style={styles.detailsContainer}>
                        <View style={styles.nameRow}>
                            <Text
                                variant="titleMedium"
                                style={[
                                    styles.name,
                                    {
                                        color: isNotRequired ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
                                        textDecorationLine: isNotRequired ? 'line-through' : 'none',
                                    },
                                ]}
                            >
                                {item.name}
                            </Text>
                            <View style={[
                                styles.badge,
                                { backgroundColor: isNotRequired ? theme.colors.outline + '30' : colors.bg },
                            ]}>
                                <Text style={[
                                    styles.badgeText,
                                    { color: isNotRequired ? theme.colors.onSurfaceVariant : colors.text },
                                ]}>
                                    {isNotRequired ? 'SKIPPED' : isUrgent ? 'URGENT' : 'LOW'}
                                </Text>
                            </View>
                        </View>
                        {categoryInfo && (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {categoryInfo.label}
                            </Text>
                        )}
                    </View>
                </View>

                <ShoppingAction
                    label="Add purchase"
                    icon="cart-plus"
                    mode="contained"
                    onPress={() => onPress(item)}
                    accessibilityLabel={`Add purchase for ${item.name}`}
                    accessibilityHint="Opens a form to record your purchase details"
                    disabled={toggleRequiredDisabled}
                />
                <View style={styles.secondaryActions}>
                    <ShoppingAction
                        label="Purchase history"
                        icon="history"
                        mode="outlined"
                        onPress={() => onInfoPress(item)}
                        accessibilityLabel={`View purchase history for ${item.name}`}
                        accessibilityHint="Shows previous purchases and prices"
                        style={styles.historyButton}
                    />
                    {showToggleRequired && onToggleRequired && (
                        <ShoppingAction
                            label={isNotRequired ? 'Add back' : 'Skip'}
                            icon={isNotRequired ? 'plus' : 'minus-circle-outline'}
                            onPress={() => onToggleRequired(item)}
                            accessibilityLabel={`${isNotRequired ? 'Add back' : 'Skip'} ${item.name}`}
                            accessibilityHint={isNotRequired
                                ? 'Returns this item to your shopping list'
                                : 'Asks for confirmation before moving this item to Skipped'}
                            disabled={toggleRequiredDisabled}
                            style={styles.skipButton}
                        />
                    )}
                </View>
            </View>
        </Surface>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginHorizontal: spacing.md,
        marginVertical: spacing.xs,
    },
    statusStrip: {
        width: 4,
    },
    content: {
        flex: 1,
        padding: spacing.sm,
        gap: spacing.sm,
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingBottom: spacing.xs,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailsContainer: {
        flex: 1,
        gap: 2,
    },
    nameRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.xs,
    },
    name: {
        fontWeight: '600',
        flexShrink: 1,
    },
    badge: {
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    secondaryActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    actionLabel: {
        flexShrink: 1,
        textAlign: 'center',
    },
    historyButton: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 160,
    },
    skipButton: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 80,
    },
});
