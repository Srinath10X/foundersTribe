/**
 * SwipeOverlay – CONNECT / PASS stamps that scale + fade in as you drag.
 */

import React from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
    type SharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
} from "react-native-reanimated";

interface SwipeOverlayProps {
    translateX: SharedValue<number>;
}

function SwipeOverlayInner({ translateX }: SwipeOverlayProps) {
    const connectStyle = useAnimatedStyle(() => {
        const progress = interpolate(translateX.value, [0, 100], [0, 1], Extrapolation.CLAMP);
        return {
            opacity: progress,
            transform: [{ scale: interpolate(progress, [0, 1], [0.7, 1], Extrapolation.CLAMP) }],
        };
    });

    const passStyle = useAnimatedStyle(() => {
        const progress = interpolate(translateX.value, [0, -100], [0, 1], Extrapolation.CLAMP);
        return {
            opacity: progress,
            transform: [{ scale: interpolate(progress, [0, 1], [0.7, 1], Extrapolation.CLAMP) }],
        };
    });

    return (
        <>
            <Animated.View style={[styles.badge, styles.connectBadge, connectStyle]}>
                <Text style={[styles.badgeText, { color: "#34C759" }]}>CONNECT</Text>
            </Animated.View>

            <Animated.View style={[styles.badge, styles.passBadge, passStyle]}>
                <Text style={[styles.badgeText, { color: "#FF3B30" }]}>PASS</Text>
            </Animated.View>
        </>
    );
}

export const SwipeOverlay = React.memo(SwipeOverlayInner);

const styles = StyleSheet.create({
    badge: {
        position: "absolute",
        top: 36,
        zIndex: 10,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 3,
    },
    connectBadge: {
        left: 20,
        borderColor: "#34C759",
        transform: [{ rotate: "-20deg" }],
    },
    passBadge: {
        right: 20,
        borderColor: "#FF3B30",
        transform: [{ rotate: "20deg" }],
    },
    badgeText: {
        fontSize: 22,
        fontFamily: "Poppins_700Bold",
        letterSpacing: 2,
    },
});
