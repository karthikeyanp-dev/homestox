import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Text, useTheme, Modal, Portal, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHomeStore } from '../store/useHomeStore';
import { useToastStore } from '../store/useToastStore';
import { spacing, borderRadius } from '../theme';
import { Home } from '../types';

interface HomeSwitcherModalProps {
    visible: boolean;
    onDismiss: () => void;
    onManageHomes?: () => void;
}

export function HomeSwitcherModal({ visible, onDismiss, onManageHomes }: HomeSwitcherModalProps) {
    const theme = useTheme();
    const { currentHomeId, setCurrentHome, getSortedHomes } = useHomeStore();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(20);
        }
    }, [visible]);

    const sortedHomes = getSortedHomes();

    const handleSelectHome = (home: Home) => {
        if (home.id === currentHomeId) {
            onDismiss();
            return;
        }

        setCurrentHome(home);
        onDismiss();
        useToastStore.getState().showToast(`"${home.name}" is now your current home.`, 'success');
    };

    const handleManageHomes = () => {
        onDismiss();
        onManageHomes?.();
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[
                    styles.modal,
                    { backgroundColor: theme.colors.surface },
                ]}
            >
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }}
                >
                    <View style={styles.header}>
                        <MaterialCommunityIcons
                            name="home-switch"
                            size={28}
                            color={theme.colors.primary}
                        />
                        <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                            Switch Home
                        </Text>
                    </View>

                    <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Select the home you want to manage
                    </Text>

                    <View style={[styles.listContainer, { backgroundColor: theme.colors.background }]}>
                        {sortedHomes.map((home, index) => {
                            const isCurrent = home.id === currentHomeId;

                            return (
                                <React.Fragment key={home.id}>
                                    <Pressable
                                        onPress={() => handleSelectHome(home)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Switch to ${home.name}`}
                                        accessibilityState={{ selected: isCurrent }}
                                        style={({ pressed }) => [
                                            styles.homeRow,
                                            { opacity: pressed ? 0.7 : 1 },
                                        ]}
                                    >
                                        <View style={[
                                            styles.iconContainer,
                                            { backgroundColor: isCurrent ? theme.colors.primaryContainer : theme.colors.surfaceVariant }
                                        ]}>
                                            <MaterialCommunityIcons
                                                name={isCurrent ? 'home' : 'home-outline'}
                                                size={24}
                                                color={isCurrent ? theme.colors.primary : theme.colors.onSurfaceVariant}
                                            />
                                        </View>
                                        <View style={styles.homeInfo}>
                                            <Text
                                                variant="bodyLarge"
                                                style={[
                                                    styles.homeName,
                                                    { color: theme.colors.onSurface },
                                                    isCurrent && { fontWeight: '700' }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {home.name}
                                            </Text>
                                            {isCurrent && (
                                                <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                                                    Current
                                                </Text>
                                            )}
                                        </View>
                                        {isCurrent && (
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={24}
                                                color={theme.colors.primary}
                                            />
                                        )}
                                    </Pressable>
                                    {index < sortedHomes.length - 1 && (
                                        <Divider style={[styles.divider, { backgroundColor: theme.colors.outline + '40' }]} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </View>

                    {onManageHomes && (
                        <Button
                            mode="text"
                            icon="cog-outline"
                            onPress={handleManageHomes}
                            style={styles.manageButton}
                            textColor={theme.colors.onSurfaceVariant}
                        >
                            Manage Homes
                        </Button>
                    )}
                </Animated.View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    modal: {
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    headerTitle: {
        fontWeight: '700',
    },
    subtitle: {
        marginBottom: spacing.md,
    },
    listContainer: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    homeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        gap: spacing.md,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    homeInfo: {
        flex: 1,
    },
    homeName: {
        fontWeight: '600',
    },
    divider: {
        marginHorizontal: spacing.md,
        height: 1,
    },
    manageButton: {
        marginTop: spacing.sm,
    },
});
