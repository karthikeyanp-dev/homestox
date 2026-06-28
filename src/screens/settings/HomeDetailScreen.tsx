import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, useTheme, Avatar, IconButton, ActivityIndicator, Chip, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useHomeStore } from '../../store/useHomeStore';
import { useToastStore } from '../../store/useToastStore';
import { useDialogStore } from '../../store/useDialogStore';
import { memberService } from '../../services/memberService';
import { InviteMemberModal } from '../../components/InviteMemberModal';
import { MemberWithProfile, HomeInvitation } from '../../types';
import { getDisplayName, getInitials } from '../../utils/profileDisplay';
import { spacing, borderRadius } from '../../theme';

export default function HomeDetailScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { homes, currentHome, setCurrentHome, updateHome, deleteHome } = useHomeStore();

    const homeId: string = route.params?.homeId;
    const home = homes.find(h => h.id === homeId) || null;
    const isCurrent = currentHome?.id === homeId;

    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [showEditName, setShowEditName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Fetch members
    const { data: members = [], isLoading: membersLoading, isRefetching, refetch } = useQuery({
        queryKey: ['home-members', homeId],
        queryFn: () => memberService.getHomeMembers(homeId),
        enabled: !!homeId,
    });

    // Fetch pending invitations for this home
    const { data: pendingInvitations = [] } = useQuery({
        queryKey: ['home-pending-invitations', homeId],
        queryFn: () => memberService.getHomePendingInvitations(homeId),
        enabled: !!homeId,
    });

    // Current user's role
    const currentUserRole = members.find(m => m.user_id === user?.id)?.role;
    const isOwner = currentUserRole === 'owner';

    // Invite mutation
    const inviteMutation = useMutation({
        mutationFn: (email: string) => memberService.inviteMember(homeId, email, user!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['home-pending-invitations', homeId] });
            setInviteModalVisible(false);
            useToastStore.getState().showToast('The invitation has been sent successfully.', 'success');
        },
        onError: (error: Error) => {
            useToastStore.getState().showToast(`Cannot Invite: ${error.message}`, 'error');
        },
    });

    // Remove member mutation
    const removeMutation = useMutation({
        mutationFn: (userId: string) => memberService.removeMember(homeId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['home-members', homeId] });
            useToastStore.getState().showToast('The member has been removed from this home.', 'info');
        },
        onError: (error: Error) => {
            useToastStore.getState().showToast(error.message, 'error');
        },
    });

    // Cancel invitation mutation
    const cancelInviteMutation = useMutation({
        mutationFn: (invitationId: string) => memberService.cancelInvitation(invitationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['home-pending-invitations', homeId] });
        },
        onError: (error: Error) => {
            useToastStore.getState().showToast(error.message, 'error');
        },
    });

    const handleRemoveMember = (member: MemberWithProfile) => {
        if (member.role === 'owner') {
            useToastStore.getState().showToast('You cannot remove the home owner.', 'error');
            return;
        }
        useDialogStore.getState().showDialog(
            'Remove Member',
            `Are you sure you want to remove ${getDisplayName(member.profile)} from this home?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(member.user_id) },
            ]
        );
    };

    const handleCancelInvitation = (invitation: HomeInvitation) => {
        useDialogStore.getState().showDialog(
            'Cancel Invitation',
            `Cancel the invitation sent to ${invitation.invited_email}?`,
            [
                { text: 'Keep', style: 'cancel' },
                { text: 'Cancel Invite', style: 'destructive', onPress: () => cancelInviteMutation.mutate(invitation.id) },
            ]
        );
    };

    const handleSetCurrent = () => {
        if (!home) return;
        setCurrentHome(home);
        useToastStore.getState().showToast(`"${home.name}" is now your current home.`, 'success');
    };

    const handleSaveName = async () => {
        const name = editedName.trim();
        if (!name || !home) return;
        setSavingName(true);
        try {
            await updateHome(home.id, name);
            setShowEditName(false);
            useToastStore.getState().showToast('Home name updated.', 'success');
        } catch (error: any) {
            useToastStore.getState().showToast(error.message, 'error');
        } finally {
            setSavingName(false);
        }
    };

    const handleDeleteHome = async () => {
        if (!home || deleting) return;
        setDeleting(true);
        try {
            await deleteHome(home.id);
            queryClient.removeQueries({ queryKey: ['home-members', home.id] });
            queryClient.removeQueries({ queryKey: ['home-pending-invitations', home.id] });
            setShowDelete(false);
            useToastStore.getState().showToast(`"${home.name}" has been deleted!`, 'success');
            navigation.goBack();
        } catch (error: any) {
            useToastStore.getState().showToast(error.message, 'error');
        } finally {
            setDeleting(false);
        }
    };

    const handleRefresh = useCallback(() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['home-pending-invitations', homeId] });
    }, [refetch, queryClient, homeId]);

    const getRoleColor = (role: string) => {
        return role === 'owner' ? theme.colors.primary : theme.colors.secondary;
    };

    const renderMemberItem = ({ item }: { item: MemberWithProfile }) => {
        const isCurrentUser = item.user_id === user?.id;
        const displayName = getDisplayName(item.profile, 'Unknown');

        return (
            <View style={[styles.memberCard, { backgroundColor: theme.colors.surface }]}>
                <Avatar.Text
                    size={48}
                    label={getInitials(displayName)}
                    style={{
                        backgroundColor: isCurrentUser ? theme.colors.primary : theme.colors.secondaryContainer,
                    }}
                    labelStyle={{
                        color: isCurrentUser ? theme.colors.onPrimary : theme.colors.onSecondaryContainer,
                    }}
                />
                <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                        <Text variant="titleMedium" style={[styles.memberName, { color: theme.colors.onSurface }]}>
                            {displayName}
                        </Text>
                        {isCurrentUser && (
                            <Chip
                                compact
                                textStyle={styles.youChipText}
                                style={[styles.youChip, { backgroundColor: theme.colors.primaryContainer }]}
                            >
                                You
                            </Chip>
                        )}
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {item.profile.email}
                    </Text>
                    <View style={styles.roleRow}>
                        <MaterialCommunityIcons
                            name={item.role === 'owner' ? 'shield-crown' : 'account'}
                            size={14}
                            color={getRoleColor(item.role)}
                        />
                        <Text variant="labelSmall" style={{ color: getRoleColor(item.role), fontWeight: '600', textTransform: 'capitalize' }}>
                            {item.role}
                        </Text>
                    </View>
                </View>
                {isOwner && !isCurrentUser && (
                    <IconButton
                        icon="dots-vertical"
                        size={20}
                        onPress={() => handleRemoveMember(item)}
                        iconColor={theme.colors.onSurfaceVariant}
                    />
                )}
            </View>
        );
    };

    const renderPendingInvitation = ({ item }: { item: HomeInvitation }) => (
        <View style={[styles.invitationCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.invitationIconContainer, { backgroundColor: theme.colors.tertiaryContainer }]}>
                <MaterialCommunityIcons name="email-fast-outline" size={22} color={theme.colors.tertiary} />
            </View>
            <View style={styles.invitationInfo}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>
                    {item.invited_email}
                </Text>
                <View style={styles.invitationStatusRow}>
                    <MaterialCommunityIcons name="clock-outline" size={12} color={theme.colors.tertiary} />
                    <Text variant="labelSmall" style={{ color: theme.colors.tertiary, fontWeight: '500' }}>
                        Pending
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        · {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            {isOwner && (
                <IconButton
                    icon="close-circle-outline"
                    size={20}
                    onPress={() => handleCancelInvitation(item)}
                    iconColor={theme.colors.error}
                />
            )}
        </View>
    );

    const ListHeader = () => (
        <View>
            {/* Home Info Card */}
            <View style={[styles.homeInfoCard, { backgroundColor: theme.colors.primaryContainer + '60' }]}>
                <View style={[styles.homeIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons name="home-variant" size={32} color={theme.colors.primary} />
                </View>
                <View style={styles.homeInfoText}>
                    <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                        {home?.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {members.length} {members.length === 1 ? 'member' : 'members'}
                        {pendingInvitations.length > 0 && ` · ${pendingInvitations.length} pending`}
                        {isCurrent && ' · Current home'}
                    </Text>
                </View>
            </View>

            {/* Home Actions */}
            <View style={styles.actionsRow}>
                {!isCurrent && (
                    <Button
                        mode="contained-tonal"
                        icon="check-circle-outline"
                        onPress={handleSetCurrent}
                        style={styles.actionButton}
                    >
                        Set as Current
                    </Button>
                )}
                {isOwner && (
                    <Button
                        mode="outlined"
                        icon="pencil-outline"
                        onPress={() => { setEditedName(home?.name || ''); setShowEditName(true); }}
                        style={styles.actionButton}
                    >
                        Edit Name
                    </Button>
                )}
            </View>

            {/* Members Section Header */}
            <View style={styles.sectionHeaderRow}>
                <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                    MEMBERS
                </Text>
                <View style={[styles.countBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                        {members.length}
                    </Text>
                </View>
            </View>
        </View>
    );

    const ListFooter = () => (
        <View>
            {/* Pending Invitations Section */}
            {pendingInvitations.length > 0 && (
                <View style={styles.pendingSection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                            PENDING INVITATIONS
                        </Text>
                        <View style={[styles.countBadge, { backgroundColor: theme.colors.tertiaryContainer }]}>
                            <Text variant="labelSmall" style={{ color: theme.colors.tertiary, fontWeight: '700' }}>
                                {pendingInvitations.length}
                            </Text>
                        </View>
                    </View>
                    {pendingInvitations.map(invite => (
                        <React.Fragment key={invite.id}>
                            {renderPendingInvitation({ item: invite })}
                        </React.Fragment>
                    ))}
                </View>
            )}

            {/* Delete Home (owners only) */}
            {isOwner && (
                <Button
                    mode="outlined"
                    icon="delete-outline"
                    onPress={() => setShowDelete(true)}
                    textColor={theme.colors.error}
                    style={[styles.deleteButton, { borderColor: theme.colors.error }]}
                >
                    Delete Home
                </Button>
            )}

            {/* Bottom spacing */}
            <View style={{ height: 100 }} />
        </View>
    );

    if (!home) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
                    </Pressable>
                    <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                        Home
                    </Text>
                </View>
                <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons name="home-alert-outline" size={48} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
                        Home not found.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
                </Pressable>
                <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {home.name}
                </Text>
                {isOwner && (
                    <Pressable
                        onPress={() => setInviteModalVisible(true)}
                        style={[styles.addButton, { backgroundColor: theme.colors.primaryContainer }]}
                    >
                        <MaterialCommunityIcons name="account-plus" size={22} color={theme.colors.primary} />
                    </Pressable>
                )}
            </View>

            {membersLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
                        Loading members...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={members}
                    keyExtractor={(item) => item.user_id}
                    renderItem={renderMemberItem}
                    ListHeaderComponent={ListHeader}
                    ListFooterComponent={ListFooter}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
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

            {/* Invite Member Modal */}
            <InviteMemberModal
                visible={inviteModalVisible}
                onDismiss={() => setInviteModalVisible(false)}
                onInvite={(email) => inviteMutation.mutate(email)}
                loading={inviteMutation.isPending}
            />

            {/* Edit Name Dialog */}
            <Portal>
                <Dialog visible={showEditName} onDismiss={() => setShowEditName(false)}>
                    <Dialog.Title>Edit Home Name</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Home Name"
                            value={editedName}
                            onChangeText={setEditedName}
                            mode="outlined"
                            autoFocus
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setShowEditName(false)} disabled={savingName}>
                            Cancel
                        </Button>
                        <Button
                            onPress={handleSaveName}
                            disabled={!editedName.trim() || savingName || editedName.trim() === home?.name}
                            loading={savingName}
                        >
                            Save
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Delete Home Dialog */}
            <Portal>
                <Dialog visible={showDelete} onDismiss={() => setShowDelete(false)}>
                    <Dialog.Title>Delete Home</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: spacing.md, color: theme.colors.onSurfaceVariant }}>
                            Are you sure you want to delete "{home?.name}"?
                        </Text>
                        <Text variant="bodySmall" style={{ marginBottom: spacing.lg, color: theme.colors.onSurfaceVariant }}>
                            All data related to this home will be permanently deleted and can't be recovered.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setShowDelete(false)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button
                            onPress={handleDeleteHome}
                            buttonColor={theme.colors.error}
                            textColor={theme.colors.onError}
                            loading={deleting}
                            disabled={deleting}
                        >
                            Delete
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
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
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
    },
    homeInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    homeIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    homeInfoText: {
        flex: 1,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    actionButton: {
        flex: 1,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    sectionLabel: {
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    countBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        minWidth: 28,
        alignItems: 'center',
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.md,
    },
    memberInfo: {
        flex: 1,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    memberName: {
        fontWeight: '600',
    },
    youChip: {
        height: 24,
        paddingVertical: 0,
    },
    youChipText: {
        fontSize: 11,
        lineHeight: 24,
        marginVertical: 0,
    },
    roleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    pendingSection: {
        marginTop: spacing.lg,
    },
    invitationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    invitationIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    invitationInfo: {
        flex: 1,
    },
    invitationStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    deleteButton: {
        marginTop: spacing.xl,
        borderWidth: 1.5,
    },
});
