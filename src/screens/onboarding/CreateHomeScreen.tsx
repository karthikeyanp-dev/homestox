import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, TextInput, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useHomeStore } from '../../store/useHomeStore';
import { useToastStore } from '../../store/useToastStore';
import { spacing, borderRadius } from '../../theme';

export default function CreateHomeScreen() {
    const [homeName, setHomeName] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuthStore();
    const { createHome } = useHomeStore();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    async function handleCreateHome() {
        const finalName = homeName.trim();

        if (!finalName) {
            useToastStore.getState().showToast('Please enter a name for your home.', 'error');
            return;
        }
        if (!user) return;

        setLoading(true);
        try {
            await createHome(finalName, user.id);
        } catch (error: any) {
            useToastStore.getState().showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }



    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={[
                styles.content,
                { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons
                        name="home-plus"
                        size={56}
                        color={theme.colors.primary}
                    />
                </View>
                <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
                    Welcome to HomeStox!
                </Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    Create your first home to start tracking your household inventory
                </Text>
            </View>



            {/* Home Name Input */}
            <View style={[styles.formSection, { backgroundColor: theme.colors.surface }]}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Enter Home Name
                </Text>
                <TextInput
                    label="Home Name"
                    placeholder="e.g., My Home, My Kitchen"
                    value={homeName}
                    onChangeText={setHomeName}
                    mode="outlined"
                    left={<TextInput.Icon icon="home-edit-outline" />}
                />
            </View>

            {/* Create Button */}
            <Button
                mode="contained"
                onPress={handleCreateHome}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                icon="check"
            >
                Create Home
            </Button>

            {/* Info */}
            <View style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons
                    name="information-outline"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1, marginLeft: spacing.sm }}>
                    You can create multiple homes and invite family members to share inventory later.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoContainer: {
        width: 112,
        height: 112,
        borderRadius: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: spacing.md,
    },
    formSection: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
    },
    button: {
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
    },
    buttonContent: {
        paddingVertical: spacing.xs,
    },
    infoCard: {
        flexDirection: 'row',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'flex-start',
    },
});
