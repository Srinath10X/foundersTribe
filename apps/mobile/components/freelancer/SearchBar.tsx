import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    ViewStyle,
    StyleProp,
} from 'react-native';
import { T, useFlowPalette } from '@/components/community/freelancerFlow/shared';
import { SP, RADIUS, SHADOWS } from './designTokens';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholders?: string[];
    onFocus?: () => void;
    onBlur?: () => void;
    showFilter?: boolean;
    onFilterPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

export function SearchBar({
    value,
    onChangeText,
    placeholders = ['Search...'],
    onFocus,
    onBlur,
    showFilter = false,
    onFilterPress,
    style,
}: SearchBarProps) {
    const { palette, isDark } = useFlowPalette();

    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const focusAnim = useRef(new Animated.Value(0)).current;

    // Cycle placeholders
    useEffect(() => {
        if (placeholders.length <= 1) return;
        const interval = setInterval(() => {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
            ]).start();
            setTimeout(() => {
                setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
            }, 350);
        }, 3500);
        return () => clearInterval(interval);
    }, [placeholders.length]);

    const handleFocus = () => {
        setIsInputFocused(true);
        Animated.spring(focusAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: false }).start();
        onFocus?.();
    };

    const handleBlur = () => {
        setIsInputFocused(false);
        Animated.spring(focusAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: false }).start();
        onBlur?.();
    };

    const borderColorAnim = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [isDark ? palette.borderLight : 'rgba(0,0,0,0.06)', palette.accent],
    });

    const showAnimatedPlaceholder = !isInputFocused && value.length === 0;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? palette.surface : '#FFFFFF',
                    borderColor: borderColorAnim,
                },
                style,
            ]}
        >
            <Ionicons name="search" size={20} color={palette.subText} style={styles.icon} />

            <View style={styles.inputWrap}>
                {showAnimatedPlaceholder && (
                    <Animated.View style={[styles.placeholderWrap, { opacity: fadeAnim }]} pointerEvents="none">
                        <T weight="medium" color={palette.subText} style={styles.placeholder}>
                            {placeholders[placeholderIndex]}
                        </T>
                    </Animated.View>
                )}
                <TextInput
                    style={[styles.input, { color: palette.text }]}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onChangeText={onChangeText}
                    value={value}
                    placeholderTextColor="transparent"
                />
            </View>

            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={palette.subText} />
                </TouchableOpacity>
            )}

            {showFilter && (
                <TouchableOpacity activeOpacity={0.7} style={styles.filterBtn} onPress={onFilterPress}>
                    <Ionicons name="options" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        paddingLeft: SP._20,
        paddingRight: SP._8,
        height: 56,
    },
    icon: {
        marginRight: SP._12,
    },
    inputWrap: {
        flex: 1,
        justifyContent: 'center',
    },
    placeholderWrap: {
        position: 'absolute',
        width: '100%',
    },
    placeholder: {
        fontSize: 15,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        fontWeight: '500',
        height: '100%',
    },
    filterBtn: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        backgroundColor: '#1C1C1E',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SP._8,
    },
});
