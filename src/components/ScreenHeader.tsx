import React from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Text, useTheme, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    rightAction?: {
        icon: string;
        onPress: () => void;
    };
    titlePressable?: boolean;
    onTitlePress?: () => void;
    showSearch?: boolean;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
}

export function ScreenHeader({
    title,
    subtitle,
    rightAction,
    titlePressable,
    onTitlePress,
    showSearch,
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search...',
}: ScreenHeaderProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const titleInner = (
        <>
            <View style={styles.titleRowInner}>
                <Text
                    variant="headlineMedium"
                    style={[styles.title, { color: theme.colors.onSurface }]}
                    numberOfLines={1}
                >
                    {title}
                </Text>
                {titlePressable && (
                    <MaterialCommunityIcons
                        name="chevron-down"
                        size={24}
                        color={theme.colors.onSurface}
                        style={styles.chevron}
                    />
                )}
            </View>
            {subtitle && (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {subtitle}
                </Text>
            )}
        </>
    );

    return (
        <View style={[styles.container, {
            paddingTop: insets.top + spacing.md,
            backgroundColor: theme.colors.background,
        }]}>
            <View style={styles.titleRow}>
                {titlePressable ? (
                    <Pressable onPress={onTitlePress} style={styles.titleContainer}>
                        {titleInner}
                    </Pressable>
                ) : (
                    <View style={styles.titleContainer}>
                        {titleInner}
                    </View>
                )}
                {rightAction && (
                    <Pressable
                        onPress={rightAction.onPress}
                        style={[styles.actionButton, { backgroundColor: theme.colors.primaryContainer }]}
                    >
                        <MaterialCommunityIcons
                            name={rightAction.icon as any}
                            size={24}
                            color={theme.colors.primary}
                        />
                    </Pressable>
                )}
            </View>
            {showSearch && (
                <Searchbar
                    placeholder={searchPlaceholder}
                    value={searchValue || ''}
                    onChangeText={onSearchChange}
                    style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
                    inputStyle={{ minHeight: 0 }}
                    elevation={0}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    titleContainer: {
        flex: 1,
    },
    titleRowInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontWeight: '700',
        flexShrink: 1,
    },
    chevron: {
        marginLeft: spacing.xs,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        marginTop: spacing.md,
        borderRadius: borderRadius.md,
    },
});
