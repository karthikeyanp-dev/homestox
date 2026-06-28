import React from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Item, ITEM_CATEGORIES } from '../types';
import { statusColors, borderRadius, spacing } from '../theme';
import { useThemeStore } from '../store/useThemeStore';

interface InventoryItemProps {
    item: Item;
    onPress: (item: Item) => void;
    onLongPress?: (item: Item) => void;
}

const statusConfig = {
    enough: { label: 'OK', shortLabel: 'OK', icon: 'check-circle' },
    nearing: { label: 'Low', shortLabel: 'LOW', icon: 'alert' },
    finished: { label: 'Out', shortLabel: 'OUT', icon: 'alert-circle' },
};

export function InventoryItem({ item, onPress, onLongPress }: InventoryItemProps) {
    const theme = useTheme();
    const { effectiveTheme } = useThemeStore();
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const colors = statusColors[effectiveTheme][item.status];
    const config = statusConfig[item.status];
    const isNotRequired = item.not_required === true;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.98,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    const categoryInfo = ITEM_CATEGORIES.find(c => c.value === item.category);

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                onPress={() => onPress(item)}
                onLongPress={() => onLongPress?.(item)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.container}
            >
                <Surface
                    style={[
                        styles.card,
                        {
                            backgroundColor: isNotRequired
                                ? theme.colors.surfaceVariant
                                : theme.colors.surface,
                            opacity: isNotRequired ? 0.7 : 1,
                        }
                    ]}
                    elevation={1}
                >
                    {/* Status Strip */}
                    <View style={[styles.statusStrip, { backgroundColor: isNotRequired ? theme.colors.outline : colors.icon }]} />

                    {/* Main Content */}
                    <View style={styles.content}>
                        <View style={styles.mainRow}>
                            {/* Category Icon */}
                            <View style={[styles.iconContainer, { backgroundColor: (isNotRequired ? theme.colors.outline : colors.icon) + '15' }]}>
                                <MaterialCommunityIcons
                                    name={(categoryInfo?.icon || 'basket-outline') as any}
                                    size={20}
                                    color={isNotRequired ? theme.colors.outline : colors.icon}
                                />
                            </View>

                            {/* Item Details */}
                            <View style={styles.detailsContainer}>
                                <View style={styles.nameRow}>
                                    <Text
                                        variant="titleMedium"
                                        style={[
                                            styles.name,
                                            {
                                                color: isNotRequired
                                                    ? theme.colors.onSurfaceVariant
                                                    : theme.colors.onSurface,
                                                textDecorationLine: isNotRequired ? 'line-through' : 'none',
                                            }
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                    
                                    {/* Status Badge */}
                                    {isNotRequired ? (
                                        <View style={[styles.badge, { backgroundColor: theme.colors.outline + '30' }]}>
                                            <Text style={[styles.badgeText, { color: theme.colors.onSurfaceVariant }]}>
                                                SKIPPED
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                                            <Text style={[styles.badgeText, { color: colors.text }]}>
                                                {config.shortLabel}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Subtitle Row */}
                                <View style={styles.subtitleRow}>
                                    {item.current_brand ? (
                                        <Text
                                            variant="bodySmall"
                                            style={{ color: theme.colors.onSurfaceVariant }}
                                            numberOfLines={1}
                                        >
                                            {item.current_brand}
                                        </Text>
                                    ) : (
                                        <Text
                                            variant="bodySmall"
                                            style={{ color: theme.colors.onSurfaceVariant }}
                                        >
                                            Tap to update status
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Chevron */}
                            <View style={styles.chevronContainer}>
                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={20}
                                    color={theme.colors.onSurfaceVariant}
                                />
                            </View>
                        </View>
                    </View>
                </Surface>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: spacing.md,
        marginVertical: spacing.xs,
    },
    card: {
        flexDirection: 'row',
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    statusStrip: {
        width: 4,
    },
    content: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
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
        alignItems: 'center',
        gap: spacing.sm,
    },
    name: {
        fontWeight: '600',
        flexShrink: 1,
    },
    badge: {
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
        flexShrink: 0,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chevronContainer: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
