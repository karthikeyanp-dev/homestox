import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, Button, List, Switch, Divider, useTheme, Avatar, Badge, Portal, Dialog, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useHomeStore } from '../../store/useHomeStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useToastStore } from '../../store/useToastStore';
import { useDialogStore } from '../../store/useDialogStore';
import { memberService } from '../../services/memberService';
import { notificationService } from '../../services/notificationService';
import { profileService } from '../../services/profileService';
import { getDisplayName, getInitials } from '../../utils/profileDisplay';
import { spacing, borderRadius } from '../../theme';

export default function SettingsScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { user, profile, signOut, loadProfile } = useAuthStore();
    const { currentHome, createHome, getSortedHomes } = useHomeStore();
    const { themeMode, setThemeMode } = useThemeStore();
    const [showCreateHome, setShowCreateHome] = useState(false);
    const [newHomeName, setNewHomeName] = useState('');
    const [creating, setCreating] = useState(false);
    const [showEditName, setShowEditName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [savingName, setSavingName] = useState(false);

    // Most-recently-accessed first; homes never accessed fall to the bottom in source order.
    const sortedHomes = getSortedHomes();

    // Fetch pending invitations count
    const { data: pendingInvitations = [] } = useQuery({
        queryKey: ['user-invitations', user?.email],
        queryFn: () => memberService.getUserPendingInvitations(user!.email!),
        enabled: !!user?.email,
    });

    // Fetch unread notifications count
    const { data: unreadNotificationCount = 0 } = useQuery({
        queryKey: ['unread-notifications', user?.id],
        queryFn: () => notificationService.getUnreadCount(user!.id),
        enabled: !!user?.id,
        refetchInterval: 30000, // Refresh every 30s
    });

    const invitationCount = pendingInvitations.length;

    const handleSignOut = () => {
        useDialogStore.getState().showDialog(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ]
        );
    };

    const handleThemeChange = () => {
        const modes: Array<'light' | 'dark' | 'system'> = ['system', 'light', 'dark'];
        const currentIndex = modes.indexOf(themeMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        setThemeMode(nextMode);
    };

    const getThemeLabel = () => {
        switch (themeMode) {
            case 'light': return 'Light';
            case 'dark': return 'Dark';
            default: return 'System';
        }
    };

    const getThemeIcon = () => {
        switch (themeMode) {
            case 'light': return 'white-balance-sunny';
            case 'dark': return 'moon-waning-crescent';
            default: return 'theme-light-dark';
        }
    };

    const displayName = getDisplayName({ full_name: profile?.full_name, email: user?.email });
    const userInitials = getInitials(displayName);

    const handleSaveName = async () => {
        const name = editedName.trim();
        if (!name || !user) return;
        setSavingName(true);
        try {
            await profileService.updateProfile(user.id, { full_name: name });
            await loadProfile(user.id);
            setShowEditName(false);
            useToastStore.getState().showToast('Your name has been updated.', 'success');
        } catch (error: any) {
            useToastStore.getState().showToast(error.message, 'error');
        } finally {
            setSavingName(false);
        }
    };

    return (
        <>
            <ScrollView
                style={[styles.container, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }}
            >
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                        Settings
                    </Text>
                </View>

                {/* User Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
                    <Avatar.Text
                        size={56}
                        label={userInitials}
                        style={{ backgroundColor: theme.colors.primary }}
                    />
                    <View style={styles.profileInfo}>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                            {displayName}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {user?.email}
                        </Text>
                    </View>
                    <IconButton
                        icon="pencil-outline"
                        iconColor={theme.colors.onSurfaceVariant}
                        style={styles.editNameIcon}
                        onPress={() => { setEditedName(profile?.full_name || ''); setShowEditName(true); }}
                    />
                </View>

                 {/* Home Selection */}
                 <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                     <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                         YOUR HOMES
                     </Text>
                     {sortedHomes.map((home) => (
                         <List.Item
                             key={home.id}
                             title={home.name}
                             description={home.id === currentHome?.id ? 'Current' : undefined}
                             left={(props) => (
                                 <List.Icon
                                     {...props}
                                     icon={home.id === currentHome?.id ? "home" : "home-outline"}
                                     color={home.id === currentHome?.id ? theme.colors.primary : theme.colors.onSurfaceVariant}
                                 />
                             )}
                             right={(props) => <List.Icon {...props} icon="chevron-right" />}
                             onPress={() => navigation.navigate('HomeDetail', { homeId: home.id })}
                             style={styles.listItem}
                         />
                     ))}
                     <Divider style={styles.divider} />
                     <List.Item
                         title="Create New Home"
                         description="Add another home to manage"
                         left={(props) => <List.Icon {...props} icon="plus-circle-outline" color={theme.colors.primary} />}
                         right={(props) => <List.Icon {...props} icon="chevron-right" />}
                         onPress={() => { setNewHomeName(''); setShowCreateHome(true); }}
                         style={styles.listItem}
                         titleStyle={{ color: theme.colors.primary }}
                     />
                 </View>

                {/* Invitations */}
                <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                        INVITATIONS
                    </Text>
                    <List.Item
                        title="Invitations"
                        description={invitationCount > 0 ? `${invitationCount} pending invitation${invitationCount > 1 ? 's' : ''}` : 'View home invitations'}
                        left={(props) => (
                            <View>
                                <List.Icon {...props} icon="email-outline" color={invitationCount > 0 ? theme.colors.tertiary : theme.colors.onSurfaceVariant} />
                                {invitationCount > 0 && (
                                    <Badge
                                        size={18}
                                        style={{
                                            position: 'absolute',
                                            top: 6,
                                            right: 2,
                                            backgroundColor: theme.colors.error,
                                        }}
                                    >
                                        {invitationCount}
                                    </Badge>
                                )}
                            </View>
                        )}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => navigation.navigate('Invitations')}
                        style={styles.listItem}
                        titleStyle={invitationCount > 0 ? { fontWeight: '600' } : undefined}
                    />
                </View>

                {/* Notifications */}
                <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                        NOTIFICATIONS
                    </Text>
                    <List.Item
                        title="Activity Feed"
                        description={unreadNotificationCount > 0 ? `${unreadNotificationCount} unread notification${unreadNotificationCount > 1 ? 's' : ''}` : 'View recent activity'}
                        left={(props) => (
                            <View>
                                <List.Icon {...props} icon="bell-outline" color={unreadNotificationCount > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                                {unreadNotificationCount > 0 && (
                                    <Badge
                                        size={18}
                                        style={{
                                            position: 'absolute',
                                            top: 6,
                                            right: 2,
                                            backgroundColor: theme.colors.error,
                                        }}
                                    >
                                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                    </Badge>
                                )}
                            </View>
                        )}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => navigation.navigate('Notifications')}
                        style={styles.listItem}
                        titleStyle={unreadNotificationCount > 0 ? { fontWeight: '600' } : undefined}
                    />
                </View>

                {/* Appearance */}
                <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                        APPEARANCE
                    </Text>
                    <List.Item
                        title="Theme"
                        description={getThemeLabel()}
                        left={(props) => <List.Icon {...props} icon={getThemeIcon()} />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={handleThemeChange}
                        style={styles.listItem}
                    />
                </View>

                {/* About & Support */}
                <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                        ABOUT
                    </Text>
                    <List.Item
                        title="Version"
                        description="1.0.0"
                        left={(props) => <List.Icon {...props} icon="information-outline" />}
                        style={styles.listItem}
                    />
                    <Divider style={styles.divider} />
                    <List.Item
                        title="Send Feedback"
                        left={(props) => <List.Icon {...props} icon="message-outline" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => Linking.openURL('mailto:support@codedelights.com')}
                        style={styles.listItem}
                    />
                    <Divider style={styles.divider} />
                    <List.Item
                        title="Privacy Policy"
                        left={(props) => <List.Icon {...props} icon="shield-outline" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => Linking.openURL('https://homestox.codedelights.com/privacy')}
                        style={styles.listItem}
                    />
                </View>

                {/* Sign Out */}
                <Button
                    mode="outlined"
                    onPress={handleSignOut}
                    textColor={theme.colors.error}
                    style={[styles.signOutButton, { borderColor: theme.colors.error }]}
                    icon="logout"
                >
                    Sign Out
                </Button>
            </ScrollView>

             {/* Edit Name Dialog */}
             <Portal>
                 <Dialog visible={showEditName} onDismiss={() => setShowEditName(false)}>
                     <Dialog.Title>Edit Your Name</Dialog.Title>
                     <Dialog.Content>
                         <Text variant="bodyMedium" style={{ marginBottom: spacing.md, color: theme.colors.onSurfaceVariant }}>
                             This name will be shown to other members in your homes.
                         </Text>
                         <TextInput
                             label="Full Name"
                             value={editedName}
                             onChangeText={setEditedName}
                             mode="outlined"
                             autoFocus
                             placeholder="John Doe"
                         />
                     </Dialog.Content>
                     <Dialog.Actions>
                         <Button onPress={() => setShowEditName(false)} disabled={savingName}>
                             Cancel
                         </Button>
                         <Button
                             onPress={handleSaveName}
                             disabled={!editedName.trim() || savingName || editedName.trim() === profile?.full_name}
                             loading={savingName}
                         >
                             Save
                         </Button>
                     </Dialog.Actions>
                 </Dialog>
             </Portal>

             {/* Create Home Dialog */}
             <Portal>
                 <Dialog visible={showCreateHome} onDismiss={() => setShowCreateHome(false)}>
                     <Dialog.Title>Create New Home</Dialog.Title>
                     <Dialog.Content>
                         <Text variant="bodyMedium" style={{ marginBottom: spacing.md, color: theme.colors.onSurfaceVariant }}>
                             Enter a name for your new home
                         </Text>
                         <TextInput
                             label="Home Name"
                             value={newHomeName}
                             onChangeText={setNewHomeName}
                             mode="outlined"
                             placeholder="e.g. My Home, Beach House"
                         />
                     </Dialog.Content>
                     <Dialog.Actions>
                         <Button onPress={() => setShowCreateHome(false)} disabled={creating}>
                             Cancel
                         </Button>
                         <Button
                             onPress={async () => {
                                 if (!newHomeName.trim() || !user) return;
                                 setCreating(true);
                                 try {
                                     await createHome(newHomeName.trim(), user.id);
                                     setShowCreateHome(false);
                                     useToastStore.getState().showToast(`"${newHomeName.trim()}" has been created!`, 'success');
                                 } catch (error: any) {
                                     useToastStore.getState().showToast(error.message, 'error');
                                 } finally {
                                     setCreating(false);
                                 }
                             }}
                             disabled={!newHomeName.trim() || creating}
                             loading={creating}
                         >
                             Create
                         </Button>
                     </Dialog.Actions>
                 </Dialog>
             </Portal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    title: {
        fontWeight: '700',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.md,
        marginBottom: spacing.lg,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        gap: spacing.md,
    },
    profileInfo: {
        flex: 1,
    },
    editNameIcon: {
        margin: 0,
    },
    section: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.lg,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    sectionTitle: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.xs,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    listItem: {
        paddingHorizontal: spacing.md,
    },
    divider: {
        marginHorizontal: spacing.md,
    },
    signOutButton: {
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        borderWidth: 1.5,
    },
});
