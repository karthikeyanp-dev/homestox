import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';

export interface AuthEntranceSlotStyle {
    opacity: Animated.Value;
    transform: { translateY: Animated.Value }[];
}

export interface AuthEntranceSlot {
    /** Animated opacity (0→1). */
    opacity: Animated.Value;
    /** Animated translateY offset (start offset → 0). */
    translateY: Animated.Value;
    /** Convenience style object ready to spread into an Animated.View. */
    style: AuthEntranceSlotStyle;
}

interface UseAuthEntranceAnimationOptions {
    /** Number of staggered slots the screen needs. */
    count: number;
    /** Initial translateY offset in px. */
    initialOffset?: number;
    /** Delay between successive slots in ms. */
    stagger?: number;
    /** Total entrance duration in ms. */
    duration?: number;
}

/**
 * Produces `count` staggered entrance animation slots (opacity + translateY)
 * that "assemble" the screen: each slot starts hidden/offset and eases in
 * with an ~80ms delay after the previous one, using a gentle spring.
 *
 * Slots are memoized for the lifetime of the component so refs stay stable
 * across re-renders.
 */
export function useAuthEntranceAnimation({
    count,
    initialOffset = 24,
    stagger = 80,
    duration = 500,
}: UseAuthEntranceAnimationOptions): AuthEntranceSlot[] {
    const [slots] = useState(() =>
        Array.from({ length: count }, () => ({
            opacity: new Animated.Value(0),
            translateY: new Animated.Value(initialOffset),
        })),
    );
    const startedRef = useRef(false);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;

        const animations = slots.map((slot, index) =>
            Animated.parallel([
                Animated.timing(slot.opacity, {
                    toValue: 1,
                    duration,
                    delay: index * stagger,
                    useNativeDriver: true,
                }),
                Animated.spring(slot.translateY, {
                    toValue: 0,
                    speed: 14,
                    bounciness: 6,
                    delay: index * stagger,
                    useNativeDriver: true,
                }),
            ]),
        );

        Animated.parallel(animations).start();
    }, [slots, duration, stagger]);

    return useMemo(
        () =>
            slots.map((slot) => ({
                opacity: slot.opacity,
                translateY: slot.translateY,
                style: {
                    opacity: slot.opacity,
                    transform: [{ translateY: slot.translateY }],
                },
            })),
        [slots],
    );
}
