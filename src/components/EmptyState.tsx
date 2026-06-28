import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface EmptyStateProps {
    icon: string;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons
                    name={icon as any}
                    size={64}
                    color={theme.colors.primary}
                />
            </View>
            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                {title}
            </Text>
            <Text variant="bodyLarge" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
                {message}
            </Text>
            {actionLabel && onAction && (
                <Button
                    mode="contained"
                    onPress={onAction}
                    style={styles.button}
                    icon="plus"
                >
                    {actionLabel}
                </Button>
            )}
        </View>
    );
}

export function EmptyShoppingList() {
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.emoji}>🎉</Text>
            </View>
            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                All Stocked Up!
            </Text>
            <Text variant="bodyLarge" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
                Your pantry is fully stocked. No items need restocking right now.
            </Text>
        </View>
    );
}

export function EmptyInventory({ onAddItem }: { onAddItem: () => void }) {
    return (
        <EmptyState
            icon="package-variant"
            title="No Items Yet"
            message="Start by adding items to your kitchen inventory. Track what you have and never run out!"
            actionLabel="Add First Item"
            onAction={onAddItem}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        marginTop: 40,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emoji: {
        fontSize: 64,
    },
    title: {
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: width * 0.8,
    },
    button: {
        marginTop: 24,
    },
});
