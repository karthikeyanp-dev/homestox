import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl, Pressable } from 'react-native';
import { Text, useTheme, Avatar, Button, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useHomeStore } from '../../store/useHomeStore';
import { useToastStore } from '../../store/useToastStore';
import { useDialogStore } from '../../store/useDialogStore';
import { memberService } from '../../services/memberService';
import { getDisplayName, getInitials } from '../../utils/profileDisplay';
import { HomeInvitation } from '../../types';
import { spacing, borderRadius } from '../../theme';

export default function InvitationsScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { refreshHomes } = useHomeStore();

    // Fetch pending invitations for this user
    const { data: invitations = [], isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['user-invitations', user?.email],
        queryFn: () => memberService.getUserPendingInvitations(user!.email!),
        enabled: !!user?.email,
    });

    // Accept mutation
    const acceptMutation = useMutation({
        mutationFn: (invitationId: string) => memberService.acceptInvitation(invitationId, user!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-invitations'] });
            // Refresh homes so the new home shows up
            if (user) refreshHomes(user.id);
            useToastStore.getState().showToast('Welcome! 🎉 You have joined the home successfully.', 'success');
        },
        onError: (error: Error) => {
            useToastStore.getState().showToast(error.message, 'error');
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: (invitationId: string) => memberService.rejectInvitation(invitationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-invitations'] });
        },
        onError: (error: Error) => {
            useToastStore.getState().showToast(error.message, 'error');
        },
    });

    const handleAccept = (invitation: HomeInvitation) => {
        useDialogStore.getState().showDialog(
            'Accept Invitation',
            `Join "${invitation.home?.name || 'this home'}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Join', onPress: () => acceptMutation.mutate(invitation.id) },
            ]
        );
    };

    const handleReject = (invitation: HomeInvitation) => {
        useDialogStore.getState().showDialog(
            'Decline Invitation',
            `Are you sure you want to decline the invitation to "${invitation.home?.name || 'this home'}"?`,
            [
                { text: 'Keep', style: 'cancel' },
                { text: 'Decline', style: 'destructive', onPress: () => rejectMutation.mutate(invitation.id) },
            ]
        );
    };

    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const inviterDisplayName = (invitation: HomeInvitation) =>
        getDisplayName(invitation.inviter_profile, 'Someone');

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const renderInvitation = ({ item }: { item: HomeInvitation }) => {
        const isProcessing = acceptMutation.isPending || rejectMutation.isPending;

        return (
            <View style={[styles.invitationCard, { backgroundColor: theme.colors.surface }]}>
                {/* Home Info */}
                <View style={styles.cardHeader}>
                    <View style={[styles.homeIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="home-variant" size={28} color={theme.colors.primary} />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                            {item.home?.name || 'Home'}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {formatDate(item.created_at)}
                        </Text>
                    </View>
                </View>

                {/* Invitation Details */}
                <View style={[styles.inviterRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Avatar.Text
                        size={32}
                        label={getInitials(inviterDisplayName(item))}
                        style={{ backgroundColor: theme.colors.secondaryContainer }}
                        labelStyle={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}
                    />
                    <View style={styles.inviterInfo}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Invited by
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>
                            {inviterDisplayName(item)}
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                    <Button
                        mode="outlined"
                        onPress={() => handleReject(item)}
                        disabled={isProcessing}
                        style={[styles.cardActionButton, { borderColor: theme.colors.error + '60' }]}
                        textColor={theme.colors.error}
                        icon="close"
                        compact
                    >
                        Decline
                    </Button>
                    <Button
                        mode="contained"
                        onPress={() => handleAccept(item)}
                        disabled={isProcessing}
                        loading={acceptMutation.isPending}
                        style={styles.cardActionButton}
                        icon="check"
                        compact
                    >
                        Accept & Join
                    </Button>
                </View>
            </View>
        );
    };

    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="email-open-outline" size={56} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', textAlign: 'center' }}>
                No Pending Invitations
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs }}>
                When someone invites you to their home, it will appear here.
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
                </Pressable>
                <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                    Invitations
                </Text>
                {invitations.length > 0 && (
                    <View style={[styles.headerBadge, { backgroundColor: theme.colors.primary }]}>
                        <Text variant="labelSmall" style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
                            {invitations.length}
                        </Text>
                    </View>
                )}
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
                        Checking for invitations...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={invitations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderInvitation}
                    ListEmptyComponent={EmptyState}
                    contentContainerStyle={[
                        styles.listContent,
                        invitations.length === 0 && styles.emptyListContent,
                    ]}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={handleRefresh}
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
        gap: spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontWeight: '700',
    },
    headerBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xxl,
    },
    emptyListContent: {
        flex: 1,
        justifyContent: 'center',
    },
    invitationCard: {
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        gap: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    homeIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardHeaderInfo: {
        flex: 1,
    },
    inviterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    inviterInfo: {
        flex: 1,
    },
    cardActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    cardActionButton: {
        flex: 1,
        borderRadius: borderRadius.md,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
    },
    emptyIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
});
