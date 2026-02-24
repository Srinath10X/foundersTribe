import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, StyleProp, Easing } from 'react-native';
import { useFlowPalette } from '@/components/community/freelancerFlow/shared';
import { SP, RADIUS, SHADOWS } from './designTokens';

interface LoadingStateProps {
    rows?: number;
    style?: StyleProp<ViewStyle>;
}

function ShimmerBar({ width, height = 14, style }: { width: string | number; height?: number; style?: object }) {
    const { palette } = useFlowPalette();
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius: height / 2,
                    backgroundColor: palette.border,
                    opacity,
                },
                style,
            ]}
        />
    );
}

function SkeletonCard() {
    const { palette } = useFlowPalette();

    return (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.borderLight }]}>
            <View style={styles.cardHeader}>
                <ShimmerBar width="35%" height={10} />
                <ShimmerBar width={60} height={24} style={{ borderRadius: 12 }} />
            </View>
            <ShimmerBar width="85%" height={18} style={{ marginTop: SP._12 }} />
            <ShimmerBar width="60%" height={14} style={{ marginTop: SP._8 }} />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <View style={styles.cardFooter}>
                <ShimmerBar width={80} height={14} />
                <ShimmerBar width={100} height={36} style={{ borderRadius: RADIUS.sm }} />
            </View>
        </View>
    );
}

export function LoadingState({ rows = 3, style }: LoadingStateProps) {
    return (
        <View style={[styles.container, style]}>
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: SP._16,
    },
    card: {
        padding: SP._20,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        ...SHADOWS.card,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        marginVertical: SP._16,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
