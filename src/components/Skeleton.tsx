import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from 'react-native-paper';

const { width } = Dimensions.get('window');

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

export function Skeleton({ width: w = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
    const theme = useTheme();
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width: w as any,
                    height,
                    borderRadius,
                    backgroundColor: theme.colors.surfaceVariant,
                    opacity,
                },
                style,
            ]}
        />
    );
}

export function ItemSkeleton() {
    return (
        <View style={styles.itemContainer}>
            <View style={styles.itemRow}>
                <Skeleton width={24} height={24} borderRadius={12} />
                <View style={styles.itemContent}>
                    <Skeleton width="60%" height={18} />
                    <Skeleton width="40%" height={14} style={{ marginTop: 6 }} />
                </View>
                <Skeleton width={60} height={24} borderRadius={12} />
            </View>
        </View>
    );
}

export function ItemListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <View style={styles.listContainer}>
            {Array.from({ length: count }).map((_, i) => (
                <ItemSkeleton key={i} />
            ))}
        </View>
    );
}

export function CardSkeleton() {
    return (
        <View style={styles.card}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={styles.cardContent}>
                <Skeleton width="70%" height={18} />
                <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    itemContainer: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemContent: {
        flex: 1,
    },
    listContainer: {
        paddingVertical: 8,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 16,
        gap: 16,
    },
    cardContent: {
        flex: 1,
    },
});
