import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable, Share } from 'react-native';
import { Text, useTheme, Chip, FAB, Surface, Button } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHomeStore } from '../../store/useHomeStore';
import { useThemeStore } from '../../store/useThemeStore';
import { inventoryService } from '../../services/inventoryService';
import { Item, ItemCategory, ITEM_CATEGORIES } from '../../types';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ShoppingItem } from '../../components/ShoppingItem';
import { ItemListSkeleton } from '../../components/Skeleton';
import { EmptyShoppingList } from '../../components/EmptyState';
import { useToastStore } from '../../store/useToastStore';
import { buildShoppingShareText } from '../../utils/shoppingShareText';
import PurchaseModal from './PurchaseModal';
import PriceHistoryModal from '../analytics/PriceHistoryModal';
import { spacing, borderRadius, statusColors } from '../../theme';

type FilterType = 'all' | 'urgent' | 'low' | 'skipped';

export default function MarketScreen() {
    const { currentHome } = useHomeStore();
    const { effectiveTheme } = useThemeStore();
    const showToast = useToastStore((s) => s.showToast);
    const queryClient = useQueryClient();
    const theme = useTheme();

    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
    const [showSkipped, setShowSkipped] = useState(false);

    const { data: items = [], isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['inventory', currentHome?.id],
        queryFn: () => inventoryService.fetchInventory(currentHome!.id),
        enabled: !!currentHome,
    });

    const toggleRequiredMutation = useMutation({
        mutationFn: ({ itemId, notRequired }: { itemId: string; notRequired: boolean }) =>
            inventoryService.toggleNotRequired(itemId, notRequired),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', currentHome?.id] });
        },
    });

    // Filter to only show items that need restocking (status !== 'enough')
    // Include skipped items only when showSkipped is enabled
    const allShoppingItems = useMemo(() => {
        let result = items.filter(i => i.status !== 'enough');
        if (!showSkipped) {
            result = result.filter(i => !i.not_required);
        }
        return result;
    }, [items, showSkipped]);

    // Apply filters
    const filteredList = useMemo(() => {
        let result = allShoppingItems;

        // Filter by search - normalize by removing spaces for flexible matching
        if (searchQuery) {
            const normalizedQuery = searchQuery.trim().toLowerCase().replace(/\s+/g, '');
            result = result.filter(item => {
                const normalizedName = item.name.toLowerCase().replace(/\s+/g, '');
                return normalizedName.includes(normalizedQuery);
            });
        }

        // Filter by status type
        if (filterType === 'urgent') {
            result = result.filter(item => item.status === 'finished' && !item.not_required);
        } else if (filterType === 'low') {
            result = result.filter(item => item.status === 'nearing' && !item.not_required);
        } else if (filterType === 'skipped') {
            result = result.filter(item => item.not_required);
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            result = result.filter(item => item.category === selectedCategory);
        }

        // Sort by priority (urgent > low > skipped), then A-Z
        return [...result].sort((a, b) => {
            const statusPriority = { finished: 0, nearing: 1, enough: 2 };
            // Skipped items always go to the bottom (priority 3)
            const aPriority = a.not_required ? 3 : statusPriority[a.status];
            const bPriority = b.not_required ? 3 : statusPriority[b.status];
            // First sort by priority
            if (aPriority !== bPriority) return aPriority - bPriority;
            // Then sort A-Z within same priority
            return a.name.localeCompare(b.name);
        });
    }, [allShoppingItems, searchQuery, filterType, selectedCategory]);

    // Get unique categories from shopping items
    const availableCategories = useMemo(() => {
        const categorySet = new Set<string>();
        allShoppingItems.forEach(item => {
            if (item.category) categorySet.add(item.category);
        });
        return ITEM_CATEGORIES.filter(cat => categorySet.has(cat.value));
    }, [allShoppingItems]);

    const handleItemPress = (item: Item) => {
        setSelectedItem(item);
        setTimeout(() => setModalVisible(true), 10);
    };

    const handleHistoryPress = (item: Item) => {
        setSelectedItem(item);
        setTimeout(() => setHistoryModalVisible(true), 10);
    };

    const handleToggleRequired = (item: Item) => {
        toggleRequiredMutation.mutate({
            itemId: item.id,
            notRequired: !item.not_required,
        });
    };

    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const handleShare = useCallback(async () => {
        // Full active list = urgent + low only (exclude skipped/not_required)
        const shareItems = allShoppingItems.filter((i) => !i.not_required);
        if (shareItems.length === 0) {
            showToast('Your shopping list is empty', 'info');
            return;
        }
        const text = buildShoppingShareText(shareItems, currentHome?.name);
        try {
            await Share.share({ message: text, title: 'Shopping List' });
        } catch {
            // User dismissed the sheet or no share app available — ignore.
        }
    }, [allShoppingItems, currentHome?.name, showToast]);

    // Counts - calculate in single pass for efficiency
    const { urgentCount, lowCount, skippedCount, activeCount } = useMemo(() => {
        let urgent = 0, low = 0, skipped = 0, active = 0;
        for (const item of allShoppingItems) {
            if (item.not_required) {
                skipped++;
            } else {
                active++;
                if (item.status === 'finished') urgent++;
                else if (item.status === 'nearing') low++;
            }
        }
        return { urgentCount: urgent, lowCount: low, skippedCount: skipped, activeCount: active };
    }, [allShoppingItems]);
    const totalToBuy = urgentCount + lowCount;

    const hasItems = allShoppingItems.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header with Summary */}
            <ScreenHeader
                title="Shopping List"
                subtitle={totalToBuy > 0 ? `${totalToBuy} items to buy` : undefined}
                rightAction={totalToBuy > 0 ? { icon: 'share-variant', onPress: handleShare } : undefined}
                showSearch
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search items..."
            />

            {/* Summary Cards - Inline with main content */}
            {hasItems && !searchQuery && (
                <View style={styles.summaryContainer}>
                    <Surface style={[styles.summaryCard, { backgroundColor: statusColors[effectiveTheme].finished.bg }]} elevation={0}>
                        <MaterialCommunityIcons
                            name="alert-circle"
                            size={16}
                            color={statusColors[effectiveTheme].finished.icon}
                        />
                        <Text style={[styles.summaryNumber, { color: statusColors[effectiveTheme].finished.icon }]}>
                            {urgentCount}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: statusColors[effectiveTheme].finished.text }]}>
                            Urgent
                        </Text>
                    </Surface>

                    <Surface style={[styles.summaryCard, { backgroundColor: statusColors[effectiveTheme].nearing.bg }]} elevation={0}>
                        <MaterialCommunityIcons
                            name="alert"
                            size={16}
                            color={statusColors[effectiveTheme].nearing.icon}
                        />
                        <Text style={[styles.summaryNumber, { color: statusColors[effectiveTheme].nearing.icon }]}>
                            {lowCount}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: statusColors[effectiveTheme].nearing.text }]}>
                            Low
                        </Text>
                    </Surface>

                    <Pressable
                        onPress={() => {
                            setShowSkipped(!showSkipped);
                            if (filterType === 'skipped') {
                                setFilterType('all');
                            }
                        }}
                        style={[
                            styles.summaryCard,
                            styles.skippedToggle,
                            {
                                backgroundColor: showSkipped ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                                borderWidth: 1,
                                borderColor: showSkipped ? theme.colors.primary : theme.colors.outline,
                            }
                        ]}
                    >
                        <MaterialCommunityIcons
                            name={showSkipped ? "eye-off-outline" : "eye-outline"}
                            size={16}
                            color={showSkipped ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        />
                        <Text style={[styles.summaryLabel, {
                            color: showSkipped ? theme.colors.primary : theme.colors.onSurfaceVariant,
                            fontWeight: showSkipped ? '700' : '500'
                        }]}>
                            {showSkipped ? 'Hide Skipped' : 'Show Skipped'}
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* Compact Filter Bar */}
            {hasItems && (
                <View style={styles.filterBar}>
                    {/* Status Filter Chips */}
                    <View style={styles.filterChips}>
                        <Chip
                            selected={filterType === 'all'}
                            onPress={() => setFilterType('all')}
                            style={[
                                styles.filterChip,
                                filterType === 'all' && { backgroundColor: theme.colors.primaryContainer }
                            ]}
                            textStyle={{ fontSize: 12 }}
                            compact
                        >
                            All ({showSkipped ? allShoppingItems.length : activeCount})
                        </Chip>
                        {urgentCount > 0 && (
                            <Chip
                                selected={filterType === 'urgent'}
                                onPress={() => setFilterType(filterType === 'urgent' ? 'all' : 'urgent')}
                                style={[
                                    styles.filterChip,
                                    filterType === 'urgent' && { backgroundColor: statusColors[effectiveTheme].finished.bg }
                                ]}
                                textStyle={{
                                    fontSize: 12,
                                    color: filterType === 'urgent' ? statusColors[effectiveTheme].finished.text : undefined
                                }}
                                compact
                            >
                                Urgent ({urgentCount})
                            </Chip>
                        )}
                        {lowCount > 0 && (
                            <Chip
                                selected={filterType === 'low'}
                                onPress={() => setFilterType(filterType === 'low' ? 'all' : 'low')}
                                style={[
                                    styles.filterChip,
                                    filterType === 'low' && { backgroundColor: statusColors[effectiveTheme].nearing.bg }
                                ]}
                                textStyle={{
                                    fontSize: 12,
                                    color: filterType === 'low' ? statusColors[effectiveTheme].nearing.text : undefined
                                }}
                                compact
                            >
                                Low ({lowCount})
                            </Chip>
                        )}
                        {showSkipped && skippedCount > 0 && (
                            <Chip
                                selected={filterType === 'skipped'}
                                onPress={() => setFilterType(filterType === 'skipped' ? 'all' : 'skipped')}
                                style={[
                                    styles.filterChip,
                                    filterType === 'skipped' && { backgroundColor: theme.colors.surfaceVariant }
                                ]}
                                textStyle={{
                                    fontSize: 12,
                                    color: filterType === 'skipped' ? theme.colors.onSurfaceVariant : undefined
                                }}
                                icon={filterType === 'skipped' ? "minus-circle-outline" : undefined}
                                compact
                            >
                                Skipped ({skippedCount})
                            </Chip>
                        )}
                    </View>
                </View>
            )}

            {/* Category Filter - Horizontal Scroll */}
            {hasItems && availableCategories.length > 0 && (
                <View style={styles.categoryContainer}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={[{ value: 'all' as const, label: 'All', icon: 'view-grid' }, ...availableCategories]}
                        keyExtractor={(item) => item.value}
                        renderItem={({ item }) => {
                            const isSelected = selectedCategory === item.value;
                            const count = item.value === 'all'
                                ? totalToBuy
                                : allShoppingItems.filter(i => i.category === item.value).length;

                            return (
                                <Chip
                                    selected={isSelected}
                                    onPress={() => setSelectedCategory(
                                        isSelected ? 'all' : item.value as ItemCategory
                                    )}
                                    style={[
                                        styles.categoryChip,
                                        { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant }
                                    ]}
                                    textStyle={{
                                        fontSize: 12,
                                        color: isSelected ? '#ffffff' : theme.colors.onSurfaceVariant
                                    }}
                                    icon={({ size }: { size: number }) => (
                                        <MaterialCommunityIcons
                                            name={item.icon as any}
                                            size={size}
                                            color={isSelected ? '#ffffff' : theme.colors.onSurfaceVariant}
                                        />
                                    )}
                                    compact
                                >
                                    {item.label} ({count})
                                </Chip>
                            );
                        }}
                        contentContainerStyle={styles.categoryList}
                    />
                </View>
            )}

            {/* Main List */}
            {isLoading ? (
                <ItemListSkeleton count={5} />
            ) : !hasItems ? (
                <EmptyShoppingList />
            ) : filteredList.length === 0 ? (
                <View style={styles.emptyFilter}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={48}
                        color={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
                        No items match your filters
                    </Text>
                    <Button
                        mode="text"
                        onPress={() => {
                            setSearchQuery('');
                            setFilterType('all');
                            setSelectedCategory('all');
                            setShowSkipped(false);
                        }}
                        style={{ marginTop: spacing.md }}
                    >
                        Clear Filters
                    </Button>
                </View>
            ) : (
                <FlatList
                    data={filteredList}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => {
                        // Add section indicator for first urgent/low/skipped item
                        const isFirstUrgent = index === 0 && item.status === 'finished' && !item.not_required;
                        const isFirstLow = item.status === 'nearing' && !item.not_required &&
                            (index === 0 || filteredList[index - 1].status !== 'nearing' || filteredList[index - 1].not_required);
                        const isFirstSkipped = item.not_required &&
                            (index === 0 || !filteredList[index - 1].not_required);

                        return (
                            <>
                                {isFirstUrgent && filterType === 'all' && urgentCount > 0 && (
                                    <View style={styles.sectionDivider}>
                                        <View style={[styles.sectionLine, { backgroundColor: statusColors[effectiveTheme].finished.icon }]} />
                                        <Text style={[styles.sectionLabel, { color: statusColors[effectiveTheme].finished.icon }]}>
                                            URGENT
                                        </Text>
                                        <View style={[styles.sectionLine, { backgroundColor: statusColors[effectiveTheme].finished.icon }]} />
                                    </View>
                                )}
                                {isFirstLow && filterType === 'all' && lowCount > 0 && (
                                    <View style={styles.sectionDivider}>
                                        <View style={[styles.sectionLine, { backgroundColor: statusColors[effectiveTheme].nearing.icon }]} />
                                        <Text style={[styles.sectionLabel, { color: statusColors[effectiveTheme].nearing.icon }]}>
                                            LOW STOCK
                                        </Text>
                                        <View style={[styles.sectionLine, { backgroundColor: statusColors[effectiveTheme].nearing.icon }]} />
                                    </View>
                                )}
                                {isFirstSkipped && showSkipped && skippedCount > 0 && (
                                    <View style={styles.sectionDivider}>
                                        <View style={[styles.sectionLine, { backgroundColor: theme.colors.outline }]} />
                                        <Text style={[styles.sectionLabel, { color: theme.colors.outline }]}>
                                            SKIPPED
                                        </Text>
                                        <View style={[styles.sectionLine, { backgroundColor: theme.colors.outline }]} />
                                    </View>
                                )}
                                <ShoppingItem
                                    item={item}
                                    onPress={handleItemPress}
                                    onInfoPress={handleHistoryPress}
                                    onToggleRequired={handleToggleRequired}
                                    showToggleRequired
                                />
                            </>
                        );
                    }}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={handleRefresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
                />
            )}

            <PurchaseModal
                visible={modalVisible}
                onDismiss={() => {
                    setModalVisible(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
            />

            <PriceHistoryModal
                visible={historyModalVisible}
                onDismiss={() => {
                    setHistoryModalVisible(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    summaryContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xs,
        gap: spacing.sm,
    },
    summaryCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.xs,
    },
    skippedToggle: {
        flex: 0,
        marginLeft: 'auto',
    },
    summaryNumber: {
        fontSize: 15,
        fontWeight: '700',
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        gap: spacing.sm,
    },
    filterChips: {
        flex: 1,
        flexDirection: 'row',
        gap: spacing.xs,
        flexWrap: 'wrap',
    },
    filterChip: {
        height: 32,
    },
    categoryContainer: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
    },
    categoryList: {
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
    },
    categoryChip: {
        height: 32,
    },
    sectionDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        opacity: 0.3,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    listContent: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.xxl,
    },
    emptyFilter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
});
