
import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Text, useTheme, IconButton, Divider, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationService, HomeNotification } from '../../services/notificationService';
import { useAuthStore } from '../../store/useAuthStore';
import { spacing, borderRadius } from '../../theme';

export default function NotificationsScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading, refetch } = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: () => notificationService.getNotifications(user!.id),
        enabled: !!user?.id,
    });

    const markAsReadMutation = useMutation({
        mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['unread-notifications', user?.id] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => notificationService.markAllAsRead(user!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['unread-notifications', user?.id] });
        },
    });

    const getNotificationIcon = (type: HomeNotification['type']) => {
        switch (type) {
            case 'status_update':
                return 'sync-circle';
            case 'purchase':
                return 'cart-check';
            case 'item_added':
                return 'plus-circle';
            case 'item_deleted':
                return 'delete-circle';
            default:
                return 'bell';
        }
    };

    const getNotificationColor = (type: HomeNotification['type']) => {
        switch (type) {
            case 'status_update':
                return theme.colors.primary;
            case 'purchase':
                return '#22C55E';
            case 'item_added':
                return theme.colors.tertiary;
            case 'item_deleted':
                return theme.colors.error;
            default:
                return theme.colors.primary;
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const handleNotificationPress = useCallback((notification: HomeNotification) => {
        if (!notification.read) {
            markAsReadMutation.mutate(notification.id);
        }
        // Could navigate to specific item or screen based on notification type
    }, [markAsReadMutation]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const renderNotification = ({ item }: { item: HomeNotification }) => (
        <Pressable
            onPress={() => handleNotificationPress(item)}
            style={[
                styles.notificationItem,
                { backgroundColor: item.read ? theme.colors.surface : theme.colors.primaryContainer + '30' }
            ]}
        >
            <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + '20' }]}>
                <MaterialCommunityIcons
                    name={getNotificationIcon(item.type)}
                    size={24}
                    color={getNotificationColor(item.type)}
                />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text
                        variant="bodyMedium"
                        style={[
                            styles.title,
                            { color: theme.colors.onSurface },
                            !item.read && { fontWeight: '700' }
                        ]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatTime(item.created_at)}
                    </Text>
                </View>
                <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                    numberOfLines={2}
                >
                    {item.body}
                </Text>
            </View>
            {!item.read && (
                <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
            )}
        </Pressable>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <IconButton
                    icon="arrow-left"
                    size={24}
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                />
                <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                    Activity Feed
                </Text>
                {unreadCount > 0 && (
                    <Pressable
                        onPress={() => markAllAsReadMutation.mutate()}
                        style={styles.markAllButton}
                    >
                        <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                            Mark all read
                        </Text>
                    </Pressable>
                )}
            </View>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons
                        name="bell-off-outline"
                        size={64}
                        color={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>
                        No notifications yet
                    </Text>
                    <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        When home members update items or make purchases, you'll see them here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderNotification}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <Divider style={{ marginHorizontal: spacing.md }} />}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={refetch}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    backButton: {
        margin: 0,
        marginLeft: -spacing.sm,
    },
    headerTitle: {
        fontWeight: '700',
        flex: 1,
    },
    markAllButton: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    listContent: {
        paddingBottom: spacing.xl,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        marginHorizontal: spacing.md,
        marginVertical: spacing.xs,
        borderRadius: borderRadius.lg,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    title: {
        flex: 1,
        marginRight: spacing.sm,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        marginTop: spacing.lg,
        fontWeight: '600',
    },
    emptySubtitle: {
        marginTop: spacing.sm,
        textAlign: 'center',
    },
});
