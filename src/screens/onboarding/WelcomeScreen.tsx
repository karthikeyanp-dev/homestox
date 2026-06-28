import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Text, useTheme, Card, ActivityIndicator, Badge } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { memberService } from '../../services/memberService';
import { getDisplayName } from '../../utils/profileDisplay';
import { spacing, borderRadius } from '../../theme';

export default function WelcomeScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { user, profile, signOut } = useAuthStore();
    const displayName = getDisplayName({ full_name: profile?.full_name, email: user?.email }, '');

    // Check for pending invitations (with auto-refresh every 30s)
    const { data: invitations = [], isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['welcome-invitations', user?.email],
        queryFn: () => memberService.getUserPendingInvitations(user!.email!),
        enabled: !!user?.email,
        refetchInterval: 30000,
    });

    const hasPendingInvitations = invitations.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl }
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={() => refetch()}
                        colors={[theme.colors.primary]}
                        tintColor={theme.colors.primary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="home-heart" size={64} color={theme.colors.primary} />
                    </View>
                    <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
                        {displayName ? `Welcome, ${displayName}` : 'Welcome to HomeStox'}
                    </Text>
                    <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Track and manage your home inventory effortlessly
                    </Text>
                </View>

                {/* Loading State */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
                            Checking for invitations...
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Pending Invitations Alert */}


                        {/* Options Section */}
                        <View style={styles.optionsContainer}>
                            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: spacing.md, fontWeight: '600' }}>
                                {hasPendingInvitations
                                    ? 'Get started:'
                                    : 'To start tracking your items, you need a home'}
                            </Text>

                            {/* Join Home Option (shown first if invitations exist) */}
                            {hasPendingInvitations && (
                                <Pressable
                                    onPress={() => navigation.navigate('PendingInvitations')}
                                    style={({ pressed }) => [
                                        styles.optionCard,
                                        {
                                            backgroundColor: theme.colors.surface,
                                            opacity: pressed ? 0.7 : 1,
                                            borderWidth: 2,
                                            borderColor: theme.colors.tertiary,
                                        }
                                    ]}
                                >
                                    <View style={[styles.optionIcon, { backgroundColor: theme.colors.tertiaryContainer }]}>
                                        <MaterialCommunityIcons name="account-multiple-plus" size={32} color={theme.colors.tertiary} />
                                    </View>
                                    <View style={styles.optionContent}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                                            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                                View Invitations
                                            </Text>
                                            <Badge size={20} style={{ backgroundColor: theme.colors.error }}>
                                                {invitations.length}
                                            </Badge>
                                        </View>
                                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
                                            Accept an invitation and join a home
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.tertiary} />
                                </Pressable>
                            )}

                            {/* Create Home Option */}
                            <Pressable
                                onPress={() => navigation.navigate('CreateHome')}
                                style={({ pressed }) => [
                                    styles.optionCard,
                                    {
                                        backgroundColor: theme.colors.surface,
                                        opacity: pressed ? 0.7 : 1,
                                    }
                                ]}
                            >
                                <View style={[styles.optionIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                                    <MaterialCommunityIcons name="home-plus" size={32} color={theme.colors.primary} />
                                </View>
                                <View style={styles.optionContent}>
                                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                        Create a New Home
                                    </Text>
                                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
                                        Set up your own space and start adding items
                                    </Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
                            </Pressable>
                        </View>

                        {/* Waiting hint when no invitations */}
                        {!hasPendingInvitations && (
                            <Card style={[styles.waitingCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                                <Card.Content>
                                    <View style={styles.waitingRow}>
                                        <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
                                        <View style={{ flex: 1, marginLeft: spacing.md }}>
                                            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                                Waiting for an invitation?
                                            </Text>
                                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
                                                If someone is adding you to their home, the invitation will appear here automatically. Pull down to refresh.
                                            </Text>
                                        </View>
                                    </View>
                                </Card.Content>
                            </Card>
                        )}

                        {/* Info Card */}
                        <Card style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Card.Content>
                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons name="information" size={20} color={theme.colors.primary} />
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1, marginLeft: spacing.sm }}>
                                        {hasPendingInvitations
                                            ? 'You can create your own home or accept an invitation to join someone else\'s home. You can be part of multiple homes!'
                                            : 'Create your own home to start tracking items, or wait for a home owner to invite you. You can be part of multiple homes!'
                                        }
                                    </Text>
                                </View>
                            </Card.Content>
                        </Card>

                        {/* Sign Out */}
                        <Pressable
                            onPress={signOut}
                            style={({ pressed }) => [
                                styles.signOutButton,
                                { opacity: pressed ? 0.6 : 1 }
                            ]}
                        >
                            <MaterialCommunityIcons name="logout" size={18} color={theme.colors.error} />
                            <Text variant="bodySmall" style={{ color: theme.colors.error, marginLeft: spacing.xs }}>
                                Sign Out
                            </Text>
                        </Pressable>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },

    optionsContainer: {
        marginBottom: spacing.lg,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    optionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionContent: {
        flex: 1,
    },
    waitingCard: {
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    waitingRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoCard: {
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xl,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
    },
});
