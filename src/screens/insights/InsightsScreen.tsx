import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, Dimensions, DimensionValue, ScrollView, BackHandler, RefreshControl } from 'react-native';
import { Text, Searchbar, useTheme, Chip, Divider, Surface } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useHomeStore } from '../../store/useHomeStore';
import { useThemeStore } from '../../store/useThemeStore';
import { inventoryService } from '../../services/inventoryService';
import { analyticsService, calcUnitPrice, calcUnitPriceValue, getBaseUnit } from '../../services/analyticsService';
import { Item, Purchase } from '../../types';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ItemListSkeleton } from '../../components/Skeleton';
import { spacing, borderRadius, statusColors } from '../../theme';

// Type for purchase with item name from joined query
type PurchaseWithItem = Purchase & {
    items: { name: string; home_id: string };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function InsightsScreen() {
    const { currentHome } = useHomeStore();
    const { effectiveTheme } = useThemeStore();
    const theme = useTheme();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    // Handle back button press - return to default list view when item is selected
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (selectedItem) {
                setSelectedItem(null);
                return true; // Prevent default back behavior
            }
            return false; // Allow default back behavior
        });

        return () => backHandler.remove();
    }, [selectedItem]);

    // Fetch all items
    const { data: items = [], isLoading: itemsLoading } = useQuery({
        queryKey: ['inventory', currentHome?.id],
        queryFn: () => inventoryService.fetchInventory(currentHome!.id),
        enabled: !!currentHome,
    });

    // Fetch recent purchases for the home (limit to 20)
    const { data: recentPurchases = [], isLoading: recentLoading } = useQuery({
        queryKey: ['recentPurchases', currentHome?.id],
        queryFn: async () => {
            const data = await analyticsService.getAllPurchasesForHome(currentHome!.id);
            return (data as PurchaseWithItem[]).slice(0, 20);
        },
        enabled: !!currentHome,
    });

    // Get unique items from recent purchases for quick access
    const recentItems = useMemo(() => {
        const itemMap = new Map<string, { item: Item; lastPurchase: PurchaseWithItem }>();
        recentPurchases.forEach((purchase) => {
            const item = items.find(i => i.id === purchase.item_id);
            if (item && !itemMap.has(item.id)) {
                itemMap.set(item.id, { item, lastPurchase: purchase });
            }
        });
        return Array.from(itemMap.values());
    }, [recentPurchases, items]);

    // Fetch purchase history for selected item
    const { data: history = [], isLoading: historyLoading } = useQuery({
        queryKey: ['purchaseHistory', selectedItem?.id],
        queryFn: () => analyticsService.getPurchaseHistory(selectedItem!.id),
        enabled: !!selectedItem,
    });

    // Fetch best value for selected item
    const { data: bestValue } = useQuery({
        queryKey: ['bestValue', selectedItem?.id],
        queryFn: () => analyticsService.getBestValueStore(selectedItem!.id),
        enabled: !!selectedItem,
    });

    // Update rating mutation
    const updateRatingMutation = useMutation({
        mutationFn: ({ purchaseId, rating }: { purchaseId: string; rating: number }) =>
            analyticsService.updatePurchaseRating(purchaseId, rating),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseHistory', selectedItem?.id] });
            queryClient.invalidateQueries({ queryKey: ['recentPurchases', currentHome?.id] });
            queryClient.invalidateQueries({ queryKey: ['inventory', currentHome?.id] });
        },
    });

    // Filter items by search - normalize by removing spaces for flexible matching
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const normalizedQuery = searchQuery.trim().toLowerCase().replace(/\s+/g, '');
        return items.filter(item => {
            const normalizedName = item.name.toLowerCase().replace(/\s+/g, '');
            return normalizedName.includes(normalizedQuery);
        });
    }, [items, searchQuery]);

    // Calculate insights using unit prices
    const insights = useMemo(() => {
        if (!history.length) return null;

        const unitPrices = history
            .filter(p => p.price > 0 && p.quantity > 0)
            .map(p => calcUnitPriceValue(p.price, p.quantity, p.unit));
        const avgUnitPrice = unitPrices.length > 0
            ? unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length
            : 0;

        // Find cheapest store by average normalized unit price
        const storeStats: Record<string, { total: number; count: number }> = {};
        history.forEach(p => {
            const up = calcUnitPriceValue(p.price, p.quantity, p.unit);
            if (p.store_name && up > 0) {
                if (!storeStats[p.store_name]) {
                    storeStats[p.store_name] = { total: 0, count: 0 };
                }
                storeStats[p.store_name].total += up;
                storeStats[p.store_name].count += 1;
            }
        });

        let cheapestStore = { name: 'N/A', avgUnitPrice: 0 };
        Object.entries(storeStats).forEach(([name, { total, count }]) => {
            const avg = total / count;
            if (cheapestStore.avgUnitPrice === 0 || avg < cheapestStore.avgUnitPrice) {
                cheapestStore = { name, avgUnitPrice: avg };
            }
        });

        // Find best rated brand
        const brandStats: Record<string, { total: number; count: number }> = {};
        history.forEach(p => {
            if (p.brand && p.rating > 0) {
                if (!brandStats[p.brand]) {
                    brandStats[p.brand] = { total: 0, count: 0 };
                }
                brandStats[p.brand].total += p.rating;
                brandStats[p.brand].count += 1;
            }
        });

        let bestBrand = { name: 'N/A', avgRating: 0 };
        Object.entries(brandStats).forEach(([name, { total, count }]) => {
            const avg = total / count;
            if (avg > bestBrand.avgRating) {
                bestBrand = { name, avgRating: avg };
            }
        });

        // Determine the base unit from purchase history
        const firstUnit = history.find(p => p.unit)?.unit || 'unit';
        const baseUnit = getBaseUnit(firstUnit);

        // Price trend data using unit prices (last 10 purchases, sorted by date)
        const sortedHistory = [...history]
            .filter(p => p.price > 0 && p.quantity > 0)
            .sort((a, b) => new Date(a.purchased_at).getTime() - new Date(b.purchased_at).getTime())
            .slice(-10);

        return {
            totalPurchases: history.length,
            avgUnitPrice,
            cheapestStore,
            bestBrand,
            baseUnit,
            priceHistory: sortedHistory,
            minUnitPrice: unitPrices.length > 0 ? Math.min(...unitPrices) : 0,
            maxUnitPrice: unitPrices.length > 0 ? Math.max(...unitPrices) : 0,
        };
    }, [history]);

    const handleSelectItem = (item: Item) => {
        setSelectedItem(item);
        setSearchQuery('');
    };

    const handleRatingPress = (purchaseId: string, newRating: number) => {
        updateRatingMutation.mutate({ purchaseId, rating: newRating });
    };

    const handleRefresh = useCallback(async () => {
        await Promise.all([
            queryClient.refetchQueries({ queryKey: ['inventory', currentHome?.id] }),
            queryClient.refetchQueries({ queryKey: ['recentPurchases', currentHome?.id] }),
            queryClient.refetchQueries({ queryKey: ['purchaseHistory', selectedItem?.id] }),
        ]);
    }, [queryClient, currentHome?.id, selectedItem?.id]);

    const renderItemSuggestion = ({ item }: { item: Item }) => {
        const colors = statusColors[effectiveTheme][item.status];
        return (
            <Pressable
                style={[styles.suggestionItem, { backgroundColor: theme.colors.surface }]}
                onPress={() => handleSelectItem(item)}
            >
                <View style={[styles.suggestionDot, { backgroundColor: colors.icon }]} />
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>
                    {item.name}
                </Text>
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                />
            </Pressable>
        );
    };

    const renderPurchaseItem = ({ item: purchase }: { item: Purchase }) => (
        <Surface style={[styles.purchaseCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.purchaseHeader}>
                <View style={styles.dateRow}>
                    <MaterialCommunityIcons
                        name="calendar"
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 6 }}>
                        {format(new Date(purchase.purchased_at), 'MMM d, yyyy')}
                    </Text>
                </View>
                <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Pressable
                            key={star}
                            onPress={() => handleRatingPress(purchase.id, star)}
                            hitSlop={8}
                        >
                            <MaterialCommunityIcons
                                name={star <= purchase.rating ? "star" : "star-outline"}
                                size={18}
                                color={star <= purchase.rating ? '#F59E0B' : theme.colors.outline}
                            />
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.purchaseDetails}>
                <View style={styles.detailChips}>
                    <View style={[styles.chip, { backgroundColor: theme.colors.primaryContainer }]}>
                        <Text style={[styles.chipText, { color: theme.colors.primary }]}>
                            {purchase.quantity} {purchase.unit}
                        </Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Text style={[styles.chipText, { color: theme.colors.secondary }]}>
                            ₹{purchase.price.toFixed(2)}
                        </Text>
                    </View>
                    {purchase.quantity > 0 && (
                        <View style={[styles.chip, { backgroundColor: theme.colors.tertiaryContainer }]}>
                            <Text style={[styles.chipText, { color: theme.colors.tertiary }]}>
                                ₹{calcUnitPrice(purchase.price, purchase.quantity, purchase.unit).value.toFixed(2)}/{calcUnitPrice(purchase.price, purchase.quantity, purchase.unit).unit}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.metaRow}>
                    {purchase.brand && (
                        <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="tag" size={14} color={theme.colors.onSurfaceVariant} />
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                                {purchase.brand}
                            </Text>
                        </View>
                    )}
                    {purchase.store_name && (
                        <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="store" size={14} color={theme.colors.onSurfaceVariant} />
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                                {purchase.store_name}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Surface>
    );

    const renderPriceChart = () => {
        if (!insights || insights.priceHistory.length < 2) return null;

        const chartWidth = SCREEN_WIDTH - (spacing.md * 4);
        const chartHeight = 140;
        const padding = { top: 20, right: 16, bottom: 30, left: 50 };
        const graphWidth = chartWidth - padding.left - padding.right;
        const graphHeight = chartHeight - padding.top - padding.bottom;

        // Use normalized unit prices for the chart
        const unitPrices = insights.priceHistory.map(p => calcUnitPriceValue(p.price, p.quantity, p.unit));
        const minPrice = Math.min(...unitPrices) * 0.95;
        const maxPrice = Math.max(...unitPrices) * 1.05;
        const priceRange = maxPrice - minPrice || 1;

        // Calculate points for the chart
        const points = insights.priceHistory.map((p, i) => {
            const up = calcUnitPriceValue(p.price, p.quantity, p.unit);
            const x = padding.left + (i / (insights.priceHistory.length - 1)) * graphWidth;
            const y = padding.top + graphHeight - ((up - minPrice) / priceRange) * graphHeight;
            return { x, y, price: up, date: p.purchased_at };
        });

        // Generate horizontal grid lines (5 lines)
        const gridLines = Array.from({ length: 5 }, (_, i) => {
            const y = padding.top + (i / 4) * graphHeight;
            const price = maxPrice - (i / 4) * priceRange;
            return { y, price };
        });

        // Create area path for gradient fill effect
        const areaPath = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ') +
            ` L ${points[points.length - 1].x} ${padding.top + graphHeight}` +
            ` L ${points[0].x} ${padding.top + graphHeight} Z`;

        // Create line path
        const linePath = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ');

        // Determine trend (up, down, or stable)
        const firstPrice = unitPrices[0];
        const lastPrice = unitPrices[unitPrices.length - 1];
        const priceChange = lastPrice - firstPrice;
        const trendPercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
        const trendColor = priceChange > 0 ? theme.colors.error : priceChange < 0 ? theme.colors.primary : theme.colors.onSurfaceVariant;
        const trendIcon = priceChange > 0 ? 'trending-up' : priceChange < 0 ? 'trending-down' : 'trending-neutral';

        return (
            <Surface style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <View style={styles.chartHeader}>
                    <View style={styles.chartTitleRow}>
                        <MaterialCommunityIcons name="chart-line-variant" size={20} color={theme.colors.primary} />
                        <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
                            Price Trend
                        </Text>
                    </View>
                    {unitPrices.length > 1 && (
                        <View style={[styles.trendBadge, { backgroundColor: trendColor + '15' }]}>
                            <MaterialCommunityIcons name={trendIcon} size={14} color={trendColor} />
                            <Text style={[styles.trendText, { color: trendColor }]}>
                                {Math.abs(trendPercent).toFixed(1)}%
                            </Text>
                        </View>
                    )}
                </View>

                <View style={[styles.chart, { height: chartHeight }]}>
                    {/* Grid lines and Y-axis labels */}
                    {gridLines.map((line, i) => (
                        <React.Fragment key={i}>
                            <View
                                style={[
                                    styles.gridLine,
                                    {
                                        top: line.y,
                                        left: padding.left,
                                        width: graphWidth,
                                    }
                                ]}
                            />
                            <Text
                                style={[
                                    styles.yAxisLabel,
                                    {
                                        top: line.y - 6,
                                        left: 0,
                                        color: theme.colors.onSurfaceVariant,
                                    }
                                ]}
                            >
                                ₹{line.price.toFixed(0)}
                            </Text>
                        </React.Fragment>
                    ))}

                    {/* Area fill (using multiple small rectangles for gradient effect) */}
                    {points.slice(0, -1).map((point, i) => {
                        const nextPoint = points[i + 1];
                        const segmentWidth = (nextPoint.x - point.x);
                        return (
                            <View
                                key={`area-${i}`}
                                style={{
                                    position: 'absolute',
                                    left: point.x,
                                    top: Math.min(point.y, nextPoint.y),
                                    width: segmentWidth,
                                    height: (padding.top + graphHeight) - Math.min(point.y, nextPoint.y),
                                    backgroundColor: theme.colors.primary + '10',
                                }}
                            />
                        );
                    })}

                    {/* Connecting lines */}
                    {points.slice(0, -1).map((point, i) => {
                        const nextPoint = points[i + 1];
                        const dx = nextPoint.x - point.x;
                        const dy = nextPoint.y - point.y;
                        const length = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                        return (
                            <View
                                key={`line-${i}`}
                                style={{
                                    position: 'absolute',
                                    left: point.x,
                                    top: point.y,
                                    width: length,
                                    height: 2,
                                    backgroundColor: theme.colors.primary,
                                    transform: [
                                        { translateY: -1 },
                                        { rotate: `${angle}deg` },
                                    ],
                                    transformOrigin: '0% 50%',
                                    opacity: 0.8,
                                }}
                            />
                        );
                    })}

                    {/* Data points */}
                    {points.map((point, i) => (
                        <View key={i} style={{ position: 'absolute', left: point.x, top: point.y }}>
                            {/* Outer glow */}
                            <View
                                style={{
                                    position: 'absolute',
                                    left: -8,
                                    top: -8,
                                    width: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    backgroundColor: theme.colors.primary + '20',
                                }}
                            />
                            {/* Inner dot */}
                            <View
                                style={{
                                    position: 'absolute',
                                    left: -5,
                                    top: -5,
                                    width: 10,
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: theme.colors.primary,
                                    borderWidth: 2,
                                    borderColor: theme.colors.surface,
                                }}
                            />
                            {/* Min/Max labels */}
                            {(point.price === Math.min(...unitPrices) || point.price === Math.max(...unitPrices)) && (
                                <View
                                    style={{
                                        position: 'absolute',
                                        left: -20,
                                        top: point.price === Math.max(...unitPrices) ? -20 : 12,
                                        backgroundColor: theme.colors.surfaceVariant,
                                        paddingHorizontal: 4,
                                        paddingVertical: 2,
                                        borderRadius: 4,
                                    }}
                                >
                                    <Text style={{ fontSize: 9, color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                                        ₹{point.price.toFixed(0)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}

                    {/* X-axis labels */}
                    <Text
                        style={[
                            styles.xAxisLabel,
                            {
                                left: padding.left,
                                top: padding.top + graphHeight + 8,
                                color: theme.colors.onSurfaceVariant,
                            }
                        ]}
                    >
                        {format(new Date(insights.priceHistory[0].purchased_at), 'MMM d')}
                    </Text>
                    <Text
                        style={[
                            styles.xAxisLabel,
                            {
                                right: padding.right,
                                top: padding.top + graphHeight + 8,
                                color: theme.colors.onSurfaceVariant,
                            }
                        ]}
                    >
                        {format(new Date(insights.priceHistory[insights.priceHistory.length - 1].purchased_at), 'MMM d')}
                    </Text>
                </View>

                {/* Stats summary */}
                <View style={styles.chartStats}>
                    <View style={styles.statItem}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Lowest</Text>
                        <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                            ₹{insights.minUnitPrice.toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Average</Text>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                            ₹{insights.avgUnitPrice.toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Highest</Text>
                        <Text variant="titleSmall" style={{ color: theme.colors.error, fontWeight: '700' }}>
                            ₹{insights.maxUnitPrice.toFixed(2)}
                        </Text>
                    </View>
                </View>
            </Surface>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScreenHeader
                title="Insights"
                subtitle="Track purchases & price trends"
            />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Search items..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
                    inputStyle={{ color: theme.colors.onSurface }}
                    iconColor={theme.colors.onSurfaceVariant}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                />
            </View>

            {/* Selected Item Chip */}
            {selectedItem && !searchQuery && (
                <View style={styles.selectedContainer}>
                    <Chip
                        mode="outlined"
                        onClose={() => setSelectedItem(null)}
                        style={styles.selectedChip}
                        icon="package-variant"
                    >
                        {selectedItem.name}
                    </Chip>
                </View>
            )}

            {/* Content */}
            {itemsLoading ? (
                <ItemListSkeleton count={5} />
            ) : searchQuery ? (
                // Show search suggestions
                <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItemSuggestion}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={itemsLoading || recentLoading}
                            onRefresh={handleRefresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons
                                name="magnify"
                                size={48}
                                color={theme.colors.onSurfaceVariant}
                            />
                            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
                                No items found
                            </Text>
                        </View>
                    }
                />
            ) : selectedItem ? (
                // Show insights for selected item
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPurchaseItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={historyLoading}
                            onRefresh={handleRefresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                        />
                    }
                    ListHeaderComponent={
                        <>
                            {/* Insights Card */}
                            {insights && (
                                <Surface style={[styles.insightsCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                                    <View style={styles.insightsHeader}>
                                        <View style={styles.insightsTitleRow}>
                                            <MaterialCommunityIcons
                                                name="chart-areaspline"
                                                size={20}
                                                color={theme.colors.primary}
                                            />
                                            <Text variant="titleMedium" style={[styles.insightsTitle, { color: theme.colors.onSurface }]}>
                                                Analytics
                                            </Text>
                                        </View>
                                        <View style={[styles.countBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary }}>
                                                {insights.totalPurchases} purchases
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.insightRow}>
                                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                            Avg. Unit Price
                                        </Text>
                                        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                            ₹{insights.avgUnitPrice.toFixed(2)}/{insights.baseUnit}
                                        </Text>
                                    </View>

                                    <View style={styles.insightRow}>
                                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                            Cheapest Store
                                        </Text>
                                        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                            {insights.cheapestStore.name} {insights.cheapestStore.avgUnitPrice > 0 && `(avg ₹${insights.cheapestStore.avgUnitPrice.toFixed(2)}/${insights.baseUnit})`}
                                        </Text>
                                    </View>

                                    <View style={styles.insightRow}>
                                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                            Best Rated Brand
                                        </Text>
                                        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                            {insights.bestBrand.name} {insights.bestBrand.avgRating > 0 && `(${insights.bestBrand.avgRating.toFixed(1)}/5)`}
                                        </Text>
                                    </View>
                                </Surface>
                            )}

                            {/* Price Chart */}
                            {renderPriceChart()}

                            {/* Purchase Log Header */}
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons
                                    name="history"
                                    size={20}
                                    color={theme.colors.onSurface}
                                />
                                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                                    Purchase History
                                </Text>
                            </View>
                        </>
                    }
                    ListEmptyComponent={
                        historyLoading ? (
                            <ItemListSkeleton count={3} />
                        ) : (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons
                                    name="cart-off"
                                    size={48}
                                    color={theme.colors.onSurfaceVariant}
                                />
                                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
                                    No purchases yet
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs }}>
                                    Buy this item to start tracking its history
                                </Text>
                            </View>
                        )
                    }
                />
            ) : recentItems.length > 0 ? (
                // Show recently purchased items for quick access
                <FlatList
                    data={recentItems}
                    keyExtractor={({ item }) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={recentLoading}
                            onRefresh={handleRefresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                        />
                    }
                    ListHeaderComponent={
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={20}
                                color={theme.colors.onSurface}
                            />
                            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                                Recently Purchased
                            </Text>
                        </View>
                    }
                    renderItem={({ item: { item, lastPurchase } }) => (
                        <Pressable
                            style={[styles.recentItemCard, { backgroundColor: theme.colors.surface }]}
                            onPress={() => handleSelectItem(item)}
                        >
                            <View style={styles.recentItemContent}>
                                <View style={styles.recentItemHeader}>
                                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                        {item.name}
                                    </Text>
                                    <View style={styles.recentItemHeaderRight}>
                                        {lastPurchase.rating > 0 && (
                                            <View style={styles.ratingBadge}>
                                                <MaterialCommunityIcons name="star" size={12} color="#F59E0B" />
                                                <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600' }}>
                                                    {lastPurchase.rating}
                                                </Text>
                                            </View>
                                        )}
                                        <MaterialCommunityIcons
                                            name="chevron-right"
                                            size={20}
                                            color={theme.colors.onSurfaceVariant}
                                        />
                                    </View>
                                </View>
                                <View style={styles.recentItemMeta}>
                                    <View style={styles.recentItemMetaItem}>
                                        <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.onSurfaceVariant} />
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                                            {format(new Date(lastPurchase.purchased_at), 'MMM d, yyyy')}
                                        </Text>
                                    </View>
                                    <View style={styles.recentItemMetaItem}>
                                        <MaterialCommunityIcons name="currency-inr" size={14} color={theme.colors.onSurfaceVariant} />
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 2 }}>
                                            {lastPurchase.price.toFixed(0)}
                                        </Text>
                                    </View>
                                    <View style={styles.recentItemMetaItem}>
                                        <MaterialCommunityIcons name="package-variant" size={14} color={theme.colors.onSurfaceVariant} />
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                                            {lastPurchase.quantity} {lastPurchase.unit}
                                        </Text>
                                    </View>
                                </View>
                                {lastPurchase.store_name && (
                                    <View style={styles.recentItemMetaItem}>
                                        <MaterialCommunityIcons name="store" size={14} color={theme.colors.onSurfaceVariant} />
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                                            {lastPurchase.store_name}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </Pressable>
                    )}
                />
            ) : (
                // Show prompt when no purchases yet
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                        name="cart-outline"
                        size={64}
                        color={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginTop: spacing.lg }}>
                        No Purchases Yet
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl }}>
                        Purchase items from your shopping list to see analytics here
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    searchbar: {
        elevation: 0,
        borderRadius: borderRadius.md,
    },
    selectedContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    selectedChip: {
        alignSelf: 'flex-start',
    },
    listContent: {
        padding: spacing.md,
        paddingTop: 0,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: borderRadius.md,
        elevation: 1,
    },
    suggestionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.md,
    },
    insightsCard: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    insightsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    insightsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    insightsTitle: {
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
    countBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    insightRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(128, 128, 128, 0.2)',
    },
    chartContainer: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    chartTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chartTitle: {
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '700',
    },
    chart: {
        position: 'relative',
    },
    gridLine: {
        position: 'absolute',
        height: 1,
        backgroundColor: 'rgba(128, 128, 128, 0.15)',
    },
    yAxisLabel: {
        position: 'absolute',
        fontSize: 10,
        width: 42,
        textAlign: 'right',
    },
    xAxisLabel: {
        position: 'absolute',
        fontSize: 10,
    },
    chartStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(128, 128, 128, 0.2)',
    },
    statItem: {
        alignItems: 'center',
        gap: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(128, 128, 128, 0.2)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
    purchaseCard: {
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    purchaseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 2,
    },
    purchaseDetails: {
        gap: spacing.sm,
    },
    detailChips: {
        flexDirection: 'row',
        gap: spacing.sm,
        flexWrap: 'wrap',
    },
    chip: {
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        marginTop: spacing.xxl,
    },
    recentItemCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: borderRadius.md,
        elevation: 1,
    },
    recentItemContent: {
        flex: 1,
    },
    recentItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    recentItemHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    recentItemMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    recentItemMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
});
