import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput as NativeTextInput, Keyboard, Platform } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Item } from '../../types';
import { shoppingService } from '../../services/shoppingService';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { useHomeStore } from '../../store/useHomeStore';
import { borderRadius, spacing, statusColors } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';
import { calcUnitPrice } from '../../services/analyticsService';

interface PurchaseModalProps {
    visible: boolean;
    onDismiss: () => void;
    item: Item | null;
}

const commonUnits = ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'dozen', 'box'];

export default function PurchaseModal({ visible, onDismiss, item }: PurchaseModalProps) {
    const { user } = useAuthStore();
    const { currentHome } = useHomeStore();
    const { effectiveTheme } = useThemeStore();
    const queryClient = useQueryClient();
    const theme = useTheme();

    const [price, setPrice] = useState('');
    const [brand, setBrand] = useState('');
    const [store, setStore] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [unit, setUnit] = useState('pcs');
    const [loading, setLoading] = useState(false);
    const [showUnitPicker, setShowUnitPicker] = useState(false);
    const [keyboardPadding, setKeyboardPadding] = useState(0);

    const priceRef = useRef<NativeTextInput>(null);
    const brandRef = useRef<NativeTextInput>(null);
    const quantityRef = useRef<NativeTextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Listen for keyboard show/hide to add bottom padding and auto-scroll
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            setKeyboardPadding(e.endCoordinates.height);
            // Scroll to bottom after a tiny delay so layout has updated
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardPadding(0);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Reset fields when modal opens with new item
    useEffect(() => {
        if (visible && item) {
            setBrand(item.current_brand || '');
            setPrice('');
            setStore('');
            setQuantity('1');
            setUnit('pcs');
            setLoading(false);
            setShowUnitPicker(false);
            setKeyboardPadding(0);
        }
    }, [visible, item]);

    async function handleCheckout() {
        if (!item || !user) return;

        setLoading(true);
        try {
            await shoppingService.checkoutItem(
                item.id,
                user.id,
                parseFloat(price) || 0,
                brand,
                store,
                0, // Rating will be added later from Insights page after product use
                parseFloat(quantity) || 1,
                unit
            );

            queryClient.invalidateQueries({ queryKey: ['inventory', currentHome?.id] });
            onDismiss();
        } catch (error: any) {
            // Silently handle error - could integrate with error tracking service here
        } finally {
            setLoading(false);
        }
    }

    // Get colors - use default if item is null
    const itemStatus = item?.status || 'enough';
    const colors = statusColors[effectiveTheme][itemStatus];

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
                dismissable={!loading}
            >
                {item ? (
                    <ScrollView
                        ref={scrollViewRef}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: keyboardPadding > 0 ? keyboardPadding * 0.5 : 0 }}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={[styles.itemBadge, { backgroundColor: colors.bg }]}>
                                <MaterialCommunityIcons
                                    name="cart-check"
                                    size={28}
                                    color={colors.icon}
                                />
                            </View>
                            <View style={styles.headerText}>
                                <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Checking out
                                </Text>
                                <Text variant="headlineSmall" style={[styles.itemName, { color: theme.colors.onSurface }]}>
                                    {item.name}
                                </Text>
                            </View>
                            <IconButton
                                icon="close"
                                size={24}
                                onPress={onDismiss}
                                style={styles.closeButton}
                            />
                        </View>

                        {/* Form Fields */}
                        <View style={styles.formSection}>
                            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                                Purchase Details
                            </Text>

                            <TextInput
                                label="Store Name"
                                value={store}
                                onChangeText={setStore}
                                mode="outlined"
                                left={<TextInput.Icon icon="store" />}
                                placeholder="Where did you buy it?"
                                style={styles.input}
                                returnKeyType="next"
                                onSubmitEditing={() => priceRef.current?.focus()}
                                blurOnSubmit={false}
                            />

                            <TextInput
                                ref={priceRef}
                                label="Price"
                                value={price}
                                onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ''))}
                                keyboardType="decimal-pad"
                                mode="outlined"
                                left={<TextInput.Icon icon="currency-inr" />}
                                placeholder="0.00"
                                style={styles.input}
                                returnKeyType="next"
                                onSubmitEditing={() => brandRef.current?.focus()}
                                blurOnSubmit={false}
                            />

                            <TextInput
                                ref={brandRef}
                                label="Brand"
                                value={brand}
                                onChangeText={setBrand}
                                mode="outlined"
                                left={<TextInput.Icon icon="tag" />}
                                placeholder="Brand name (optional)"
                                style={styles.input}
                                returnKeyType="next"
                                onSubmitEditing={() => quantityRef.current?.focus()}
                                blurOnSubmit={false}
                            />

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: spacing.sm }}>
                                    <TextInput
                                        ref={quantityRef}
                                        label="Quantity"
                                        value={quantity}
                                        onChangeText={(text) => setQuantity(text.replace(/[^0-9.]/g, ''))}
                                        keyboardType="decimal-pad"
                                        mode="outlined"
                                        style={styles.input}
                                        returnKeyType="done"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                    <Pressable
                                        onPress={() => setShowUnitPicker(!showUnitPicker)}
                                        style={[styles.unitPicker, {
                                            borderColor: theme.colors.outline,
                                            backgroundColor: theme.colors.surface,
                                        }]}
                                    >
                                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Unit</Text>
                                        <View style={styles.unitPickerValue}>
                                            <Text style={{ color: theme.colors.onSurface, fontSize: 16 }}>{unit}</Text>
                                            <MaterialCommunityIcons
                                                name={showUnitPicker ? "chevron-up" : "chevron-down"}
                                                size={20}
                                                color={theme.colors.onSurfaceVariant}
                                            />
                                        </View>
                                    </Pressable>
                                </View>
                            </View>

                            {showUnitPicker && (
                                <View style={[styles.unitOptions, { backgroundColor: theme.colors.surfaceVariant }]}>
                                    {commonUnits.map((u) => (
                                        <Pressable
                                            key={u}
                                            onPress={() => {
                                                setUnit(u);
                                                setShowUnitPicker(false);
                                            }}
                                            style={[
                                                styles.unitOption,
                                                u === unit && { backgroundColor: theme.colors.primaryContainer }
                                            ]}
                                        >
                                            <Text style={{
                                                color: u === unit ? theme.colors.primary : theme.colors.onSurface,
                                                fontWeight: u === unit ? '600' : '400',
                                            }}>
                                                {u}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}

                            {/* Unit Price Preview */}
                            {parseFloat(price) > 0 && parseFloat(quantity) > 0 && (
                                <View style={[styles.unitPricePreview, { backgroundColor: theme.colors.tertiaryContainer }]}>
                                    <MaterialCommunityIcons
                                        name="calculator"
                                        size={18}
                                        color={theme.colors.tertiary}
                                    />
                                    <Text style={{ color: theme.colors.tertiary, marginLeft: spacing.sm, fontWeight: '600' }}>
                                        Unit Price: ₹{calcUnitPrice(parseFloat(price), parseFloat(quantity), unit).value.toFixed(2)}/{calcUnitPrice(parseFloat(price), parseFloat(quantity), unit).unit}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <Button
                                mode="outlined"
                                onPress={onDismiss}
                                style={styles.actionButton}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleCheckout}
                                loading={loading}
                                disabled={loading}
                                style={styles.actionButton}
                                icon="check"
                            >
                                Mark as Bought
                            </Button>
                        </View>
                    </ScrollView>
                ) : (
                    <View style={styles.loadingView}>
                        <Text>Loading...</Text>
                    </View>
                )}
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        margin: spacing.md,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        maxHeight: '85%',
    },
    loadingView: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
    },
    itemBadge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        marginLeft: spacing.md,
    },
    itemName: {
        fontWeight: '600',
    },
    closeButton: {
        margin: -8,
    },
    formSection: {
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: spacing.md,
    },
    input: {
        marginBottom: spacing.sm,
    },
    row: {
        flexDirection: 'row',
    },
    unitPicker: {
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xs,
        paddingBottom: spacing.md,
        height: 56,
        justifyContent: 'space-between',
    },
    unitPickerValue: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    unitOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
    },
    unitOption: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    actionButton: {
        flex: 1,
    },
    unitPricePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
    },
});
