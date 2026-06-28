import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, useTheme, RadioButton, Divider, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Item, ItemCategory, ITEM_CATEGORIES } from '../types';
import { borderRadius, spacing } from '../theme';

interface AddItemModalProps {
    visible: boolean;
    onDismiss: () => void;
    onAdd: (name: string, status: Item['status'], category?: ItemCategory) => void;
    loading?: boolean;
    editMode?: boolean;
    initialName?: string;
    initialCategory?: ItemCategory;
    onUpdate?: (name: string, category?: ItemCategory) => void;
}

export function AddItemModal({ visible, onDismiss, onAdd, loading, editMode, initialName, initialCategory, onUpdate }: AddItemModalProps) {
    const theme = useTheme();
    const [name, setName] = React.useState('');
    const [status, setStatus] = React.useState<Item['status']>('enough');
    const [category, setCategory] = React.useState<ItemCategory>('Other');

    // Pre-fill state when opening in edit mode
    React.useEffect(() => {
        if (visible && editMode) {
            setName(initialName || '');
            setCategory(initialCategory || 'Other');
        } else if (visible && !editMode) {
            // Reset state when opening in add mode
            setName('');
            setStatus('enough');
            setCategory('Other');
        }
    }, [visible, editMode, initialName, initialCategory]);

    const handleSave = () => {
        if (name.trim()) {
            if (editMode && onUpdate) {
                onUpdate(name.trim(), category);
            } else {
                onAdd(name.trim(), status, category);
            }
            setName('');
            setStatus('enough');
            setCategory('Other');
        }
    };

    const handleDismiss = () => {
        setName('');
        setStatus('enough');
        setCategory('Other');
        onDismiss();
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={handleDismiss}
                contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
            >
                <View style={styles.header}>
                    <MaterialCommunityIcons
                        name={editMode ? "pencil-outline" : "package-variant-plus"}
                        size={28}
                        color={theme.colors.primary}
                    />
                    <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                        {editMode ? "Edit Item" : "Add New Item"}
                    </Text>
                </View>

                <TextInput
                    label="Item Name"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    placeholder="e.g., Milk, Bread, Coffee..."
                    style={styles.input}
                />

                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Category
                </Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                    contentContainerStyle={styles.categoryContent}
                >
                    {ITEM_CATEGORIES.map(cat => {
                        const isSelected = category === cat.value;
                        return (
                            <Chip
                                key={cat.value}
                                selected={isSelected}
                                onPress={() => setCategory(cat.value)}
                                style={[
                                    styles.categoryChip,
                                    isSelected && { backgroundColor: theme.colors.primaryContainer }
                                ]}
                                textStyle={isSelected ? { color: theme.colors.onPrimaryContainer } : undefined}
                                showSelectedOverlay
                                compact
                                icon={cat.icon}
                            >
                                {cat.label}
                            </Chip>
                        );
                    })}
                </ScrollView>

                {!editMode && (
                    <>
                        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                            Current Stock Level
                        </Text>

                        <RadioButton.Group onValueChange={(v) => setStatus(v as Item['status'])} value={status}>
                            <TouchableOpacity
                                onPress={() => setStatus('enough')}
                                style={[
                                    styles.radioOption,
                                    status === 'enough' && { backgroundColor: theme.colors.primaryContainer }
                                ]}
                            >
                                <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
                                <View style={styles.radioText}>
                                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Stocked</Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        Have plenty in stock
                                    </Text>
                                </View>
                                <RadioButton value="enough" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setStatus('nearing')}
                                style={[
                                    styles.radioOption,
                                    status === 'nearing' && { backgroundColor: theme.colors.primaryContainer }
                                ]}
                            >
                                <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                                <View style={styles.radioText}>
                                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Running Low</Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        Will need soon
                                    </Text>
                                </View>
                                <RadioButton value="nearing" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setStatus('finished')}
                                style={[
                                    styles.radioOption,
                                    status === 'finished' && { backgroundColor: theme.colors.primaryContainer }
                                ]}
                            >
                                <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                                <View style={styles.radioText}>
                                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Out of Stock</Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        Need to buy immediately
                                    </Text>
                                </View>
                                <RadioButton value="finished" />
                            </TouchableOpacity>
                        </RadioButton.Group>
                    </>
                )}

                <View style={styles.actions}>
                    <Button
                        mode="outlined"
                        onPress={handleDismiss}
                        style={styles.actionButton}
                    >
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleSave}
                        loading={loading}
                        disabled={!name.trim() || loading}
                        style={styles.actionButton}
                    >
                        {editMode ? "Save" : "Add Item"}
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: {
        margin: spacing.lg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    title: {
        fontWeight: '600',
    },
    input: {
        marginBottom: spacing.lg,
    },
    categoryScroll: {
        marginBottom: spacing.lg,
    },
    categoryContent: {
        gap: spacing.xs,
    },
    categoryChip: {
        marginRight: 2,
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: spacing.sm,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: spacing.md,
    },
    radioText: {
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    actionButton: {
        flex: 1,
    },
});
