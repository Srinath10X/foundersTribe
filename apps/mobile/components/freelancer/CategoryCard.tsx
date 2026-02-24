import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { T, useFlowPalette } from '@/components/community/freelancerFlow/shared';
import { SP, RADIUS, SHADOWS } from './designTokens';

interface CategoryCardProps {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

export function CategoryCard({ title, icon, color, bgColor, onPress, style }: CategoryCardProps) {
    const { palette } = useFlowPalette();

    return (
        <TouchableOpacity activeOpacity={1} onPress={onPress} style={[styles.wrapper, style]}>
            <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
                <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
                    <Ionicons name={icon} size={28} color={color} />
                </View>
                <T weight="semiBold" color={palette.text} style={styles.title}>
                    {title}
                </T>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '47%',
    },
    container: {
        padding: SP._16,
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        borderRadius: RADIUS.lg,
        minHeight: 140,
        borderWidth: 1,
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SP._20,
    },
    title: {
        fontSize: 16,
        lineHeight: 22,
        letterSpacing: -0.3,
    },
});
