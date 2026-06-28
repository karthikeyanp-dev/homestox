import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, Pressable } from 'react-native';
import { Text, FAB, useTheme, Chip, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHomeStore } from '../../store/useHomeStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { inventoryService } from '../../services/inventoryService';
import { Item, ItemCategory, ITEM_CATEGORIES } from '../../types';
import { ScreenHeader } from '../../components/ScreenHeader';
import { HomeSwitcherModal } from '../../components/HomeSwitcherModal';
import { InventoryItem } from '../../components/InventoryItem';
import { AddItemModal } from '../../components/AddItemModal';
import { ItemActionsModal } from '../../components/ItemActionsModal';
import { ItemListSkeleton } from '../../components/Skeleton';
import { EmptyInventory } from '../../components/EmptyState';
import { spacing, borderRadius, statusColors } from '../../theme';

type FilterType = 'all' | 'urgent' | 'low' | 'stocked' | 'skipped';

export default function KitchenScreen() {
    const { homes, currentHome } = useHomeStore();
    const { effectiveTheme } = useThemeStore();
    const { user } = useAuthStore();
    const navigation = useNavigation<any>();
    const queryClient = useQueryClient();
    const theme = useTheme();

    const [addModalVisible, setAddModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [actionsModalVisible, setActionsModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
    const [showSkipped, setShowSkipped] = useState(false);
    const [switcherVisible, setSwitcherVisible] = useState(false);

    const { data: items = [], isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['inventory', currentHome?.id],
        queryFn: () => inventoryService.fetchInventory(currentHome!.id),
        enabled: !!currentHome,
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ itemId, status }: { itemId: string; status: Item['status'] }) =>
            inventoryService.updateStatus(itemId, status, user?.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', currentHome?.id] });
            setActionsModalVisible(false);
        },
    });

    const addItemMutation = useMutation({
        mutationFn: ({ name, status, category }: { name: string; status: Item['status']; category?: ItemCategory }) =>
            inventoryService.addItemWithStatus(currentHome!.id, name, status, category, user?.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', currentHome?.id] });
            setAddModalVisible(false);
        },
    });

    const deleteItemMutation = useMutation({
        mutationFn: (itemId: string) => inventoryService.deleteItem(itemId, user?.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', currentHome?.id] });
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            setActionsModalVisible(false);
        },
        onError: (error: any) => {
            useToastStore.getState().showToast(error.message || 'Failed to delete item', 'error');
        },
    });

    const toggleRequiredMutation = useMutation({
        mutationFn: ({ itemId, notRequired }: { itemId: string; notRequired: boolean }) =>
            inventoryService.toggleNotRequired(itemId, notRequired),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', currentHome?.id] });
        },
    });

    const updateItemDetailsMutation = useMutation({
        mutationFn: ({ itemId, name, category }: { itemId: string; name: string; category?: ItemCategory }) =>
            inventoryService.updateItemDetails(itemId, { name, category }, user?.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', currentHome?.id] });
            queryClient.invalidateQueries({ queryKey: ['recentPurchases', currentHome?.id] });
            queryClient.invalidateQueries({ queryKey: ['purchaseHistory'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            setEditModalVisible(false);
            useToastStore.getState().showToast('Item updated successfully', 'success');
        },
        onError: (error: any) => {
            useToastStore.getState().showToast(error.message || 'Failed to update item', 'error');
        },
    });

    // Filter and search items
    const filteredList = useMemo(() => {
        let result = items;

        // Filter by search - normalize by removing spaces for flexible matching
        if (searchQuery) {
            const normalizedQuery = searchQuery.trim().toLowerCase().replace(/\s+/g, '');
            result = result.filter(item => {
                const normalizedName = item.name.toLowerCase().replace(/\s+/g, '');
                return normalizedName.includes(normalizedQuery);
            });
        }

        // Filter by status type
        if (filter === 'urgent') {
            result = result.filter(item => item.status === 'finished' && !item.not_required);
        } else if (filter === 'low') {
            result = result.filter(item => item.status === 'nearing' && !item.not_required);
        } else if (filter === 'stocked') {
            result = result.filter(item => item.status === 'enough' && !item.not_required);
        } else if (filter === 'skipped') {
            result = result.filter(item => item.not_required);
        }

        // Hide skipped items by default (unless showSkipped is enabled or filter is 'skipped')
        if (!showSkipped && filter !== 'skipped') {
            result = result.filter(item => !item.not_required);
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            result = result.filter(item => item.category === selectedCategory);
        }

        // Sort by priority (urgent > low > stocked > skipped), then A-Z
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
    }, [items, searchQuery, filter, selectedCategory, showSkipped]);

    // Get unique categories from items
    const availableCategories = useMemo(() => {
        const categorySet = new Set<string>();
        items.forEach(item => {
            if (item.category) categorySet.add(item.category);
        });
        return ITEM_CATEGORIES.filter(cat => categorySet.has(cat.value));
    }, [items]);

    const handleItemPress = (item: Item) => {
        setSelectedItem(item);
        setActionsModalVisible(true);
    };

    const handleAddItem = (name: string, status: Item['status'], category?: ItemCategory) => {
        addItemMutation.mutate({ name, status, category });
    };

    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    // Counts - calculate in single pass for efficiency
    const { urgentCount, lowCount, stockedCount, skippedCount, activeCount } = useMemo(() => {
        let urgent = 0, low = 0, stocked = 0, skipped = 0, active = 0;
        for (const item of items) {
            if (item.not_required) {
                skipped++;
            } else {
                active++;
                if (item.status === 'finished') urgent++;
                else if (item.status === 'nearing') low++;
                else if (item.status === 'enough') stocked++;
            }
        }
        return { urgentCount: urgent, lowCount: low, stockedCount: stocked, skippedCount: skipped, activeCount: active };
    }, [items]);

    const hasItems = items.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <ScreenHeader
                title={currentHome?.name || 'Kitchen'}
                subtitle={`${activeCount} items tracked`}
                titlePressable={homes.length > 1}
                onTitlePress={() => setSwitcherVisible(true)}
                showSearch
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search items..."
            />

            {/* Summary Cards */}
            {hasItems && !searchQuery && (
                <View style={styles.summaryContainer}>
                    <Surface style={[styles.summaryChip, { backgroundColor: statusColors[effectiveTheme].finished.bg }]} elevation={0}>
                        <MaterialCommunityIcons
                            name="alert-circle"
                            size={16}
                            color={statusColors[effectiveTheme].finished.icon}
                        />
                        <Text style={[styles.summaryChipNumber, { color: statusColors[effectiveTheme].finished.icon }]}>
                            {urgentCount}
                        </Text>
                        <Text style={[styles.summaryChipLabel, { color: statusColors[effectiveTheme].finished.text }]}>
                            Out
                        </Text>
                    </Surface>

                    <Surface style={[styles.summaryChip, { backgroundColor: statusColors[effectiveTheme].nearing.bg }]} elevation={0}>
                        <MaterialCommunityIcons
                            name="alert"
                            size={16}
                            color={statusColors[effectiveTheme].nearing.icon}
                        />
                        <Text style={[styles.summaryChipNumber, { color: statusColors[effectiveTheme].nearing.icon }]}>
                            {lowCount}
                        </Text>
                        <Text style={[styles.summaryChipLabel, { color: statusColors[effectiveTheme].nearing.text }]}>
                            Low
                        </Text>
                    </Surface>

                    <Surface style={[styles.summaryChip, { backgroundColor: statusColors[effectiveTheme].enough.bg }]} elevation={0}>
                        <MaterialCommunityIcons
                            name="check-circle"
                            size={16}
                            color={statusColors[effectiveTheme].enough.icon}
                        />
                        <Text style={[styles.summaryChipNumber, { color: statusColors[effectiveTheme].enough.icon }]}>
                            {stockedCount}
                        </Text>
                        <Text style={[styles.summaryChipLabel, { color: statusColors[effectiveTheme].enough.text }]}>
                            OK
                        </Text>
                    </Surface>

                    <Pressable
                        onPress={() => {
                            setShowSkipped(!showSkipped);
                            if (filter === 'skipped') {
                                setFilter('all');
                            }
                        }}
                        style={[
                            styles.summaryChip,
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
                        <Text style={[styles.summaryChipLabel, {
                            color: showSkipped ? theme.colors.primary : theme.colors.onSurfaceVariant,
                            fontWeight: showSkipped ? '700' : '600'
                        }]}>
                            {showSkipped ? 'Hide Skipped' : 'Show Skipped'}
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* Filter Bar */}
            {hasItems && (
                <View style={styles.filterBar}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={[
                            { key: 'all', label: 'All', count: showSkipped ? items.length : activeCount },
                            ...(urgentCount > 0 ? [{ key: 'urgent', label: 'Out', count: urgentCount }] : []),
                            ...(lowCount > 0 ? [{ key: 'low', label: 'Low', count: lowCount }] : []),
                            ...(stockedCount > 0 ? [{ key: 'stocked', label: 'OK', count: stockedCount }] : []),
                            ...(showSkipped && skippedCount > 0 ? [{ key: 'skipped', label: 'Skipped', count: skippedCount }] : []),
                        ]}
                        keyExtractor={(item) => item.key}
                        renderItem={({ item }) => {
                            const isSelected = filter === item.key;
                            const isUrgent = item.key === 'urgent';
                            const isLow = item.key === 'low';
                            const isStocked = item.key === 'stocked';
                            const isSkipped = item.key === 'skipped';

                            let bgColor = theme.colors.surfaceVariant;
                            let textColor = theme.colors.onSurfaceVariant;

                            if (isSelected) {
                                if (isUrgent) {
                                    bgColor = statusColors[effectiveTheme].finished.bg;
                                    textColor = statusColors[effectiveTheme].finished.text;
                                } else if (isLow) {
                                    bgColor = statusColors[effectiveTheme].nearing.bg;
                                    textColor = statusColors[effectiveTheme].nearing.text;
                                } else if (isStocked) {
                                    bgColor = statusColors[effectiveTheme].enough.bg;
                                    textColor = statusColors[effectiveTheme].enough.text;
                                } else if (isSkipped) {
                                    bgColor = theme.colors.surfaceVariant;
                                    textColor = theme.colors.onSurfaceVariant;
                                } else {
                                    bgColor = theme.colors.primaryContainer;
                                    textColor = theme.colors.onPrimaryContainer;
                                }
                            }

                            return (
                                <Chip
                                    selected={isSelected}
                                    onPress={() => setFilter(isSelected ? 'all' : item.key as FilterType)}
                                    style={[
                                        styles.filterChip,
                                        { backgroundColor: bgColor }
                                    ]}
                                    textStyle={{
                                        fontSize: 12,
                                        color: textColor
                                    }}
                                    icon={isSkipped && isSelected ? "minus-circle-outline" : undefined}
                                    compact
                                >
                                    {item.label} ({item.count})
                                </Chip>
                            );
                        }}
                        contentContainerStyle={styles.filterList}
                    />
                </View>
            )}

            {/* Category Filter */}
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
                                ? items.length
                                : items.filter(i => i.category === item.value).length;

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
                <ItemListSkeleton count={6} />
            ) : !hasItems ? (
                <EmptyInventory onAddItem={() => setAddModalVisible(true)} />
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
                    <Pressable
                        onPress={() => {
                            setSearchQuery('');
                            setFilter('all');
                            setSelectedCategory('all');
                        }}
                        style={{ marginTop: spacing.md }}
                    >
                        <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                            Clear Filters
                        </Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={filteredList}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => {
                        // Add section indicator for first item of each status group
                        const isFirstUrgent = index === 0 && item.status === 'finished' && !item.not_required;
                        const isFirstLow = item.status === 'nearing' && !item.not_required &&
                            (index === 0 || filteredList[index - 1].status !== 'nearing' || filteredList[index - 1].not_required);
                        const isFirstStocked = item.status === 'enough' && !item.not_required &&
                            (index === 0 || filteredList[index - 1].status === 'finished' || filteredList[index - 1].status === 'nearing' || filteredList[index - 1].not_required);
                        const isFirstSkipped = item.not_required &&
                            (index === 0 || !filteredList[index - 1].not_required);

                        return (
                            <>
                                {isFirstUrgent && filter === 'all' && urgentCount > 0 && (
                                    <View style={styles.sectionDivider}>
                                        <View style={[styles.sectionLine, { backgroundColor: statusColors[effectiveTheme].finished.icon }]} />
                                        <Text style={[styles.sectionLabel, { color: statusColors[effectiveTheme].finished.icon }]}>
                                            OUT OF STOCK
                                        </Text>
                                        <View style={[styles.sectionLine, { backgroundColor: statusColors[effectiveTheme].finished.icon }]} />
                                    </View>
                                )}
                                {isFirstLow && filter === 'all' && lowCount > 0 && (
                                    <View style={styles.sectionDivider}>
                                        <View style={[styles.sectionLine, { backgroundColor: statusColors[effectiveTheme].nearing.icon }]} />
                                        <Text style={[styles.sectionLabel, { color: statusColors[effectiveTheme].nearing.icon }]}>
                                            RUNNING LOW
                                        </Text>
                                        <View style={[styles.sectionLine, { backgroundColor: statusColors[effectiveTheme].nearing.icon }]} />
                                    </View>
                                )}
                                {isFirstStocked && filter === 'all' && stockedCount > 0 && (
                                    <View style={styles.sectionDivider}>
                                        <View style={[styles.sectionLine, { backgroundColor: statusColors[effectiveTheme].enough.icon }]} />
                                        <Text style={[styles.sectionLabel, { color: statusColors[effectiveTheme].enough.icon }]}>
                                            STOCKED
                                        </Text>
                                        <View style={[styles.sectionLine, { backgroundColor: statusColors[effectiveTheme].enough.icon }]} />
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
                                <InventoryItem
                                    item={item}
                                    onPress={handleItemPress}
                                    onLongPress={handleItemPress}
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

            {/* FAB */}
            <FAB
                icon="plus"
                label="Add Item"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="#fff"
                onPress={() => setAddModalVisible(true)}
            />

            <AddItemModal
                visible={addModalVisible}
                onDismiss={() => setAddModalVisible(false)}
                onAdd={handleAddItem}
                loading={addItemMutation.isPending}
            />

            <ItemActionsModal
                visible={actionsModalVisible}
                onDismiss={() => {
                    setActionsModalVisible(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
                onUpdateStatus={(status) => {
                    if (selectedItem) {
                        updateStatusMutation.mutate({ itemId: selectedItem.id, status });
                    }
                }}
                onDelete={() => {
                    if (selectedItem) {
                        deleteItemMutation.mutate(selectedItem.id);
                    }
                }}
                onToggleRequired={(notRequired) => {
                    if (selectedItem) {
                        setSelectedItem({ ...selectedItem, not_required: notRequired });
                        toggleRequiredMutation.mutate({ itemId: selectedItem.id, notRequired });
                    }
                }}
                onEdit={() => {
                    setActionsModalVisible(false);
                    setEditModalVisible(true);
                }}
                loading={updateStatusMutation.isPending || deleteItemMutation.isPending}
            />

            <AddItemModal
                visible={editModalVisible}
                onDismiss={() => setEditModalVisible(false)}
                onAdd={handleAddItem}
                editMode
                initialName={selectedItem?.name}
                initialCategory={selectedItem?.category}
                onUpdate={(name, category) => {
                    if (selectedItem) {
                        updateItemDetailsMutation.mutate({
                            itemId: selectedItem.id,
                            name,
                            category,
                        });
                    }
                }}
                loading={updateItemDetailsMutation.isPending}
            />

            <HomeSwitcherModal
                visible={switcherVisible}
                onDismiss={() => setSwitcherVisible(false)}
                onManageHomes={() => {
                    navigation.navigate('SettingsTab', { screen: 'SettingsMain' });
                }}
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
        paddingTop: spacing.sm,
        gap: spacing.md,
    },
    summaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.xs,
        height: 32,
    },
    skippedToggle: {
        marginLeft: 'auto',
    },
    summaryChipNumber: {
        fontSize: 14,
        fontWeight: '700',
    },
    summaryChipLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    filterBar: {
        paddingTop: spacing.md,
    },
    filterList: {
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
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
        paddingBottom: 100,
    },
    emptyFilter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    fab: {
        position: 'absolute',
        margin: spacing.md,
        right: 0,
        bottom: 0,
        borderRadius: borderRadius.full,
    },
});
