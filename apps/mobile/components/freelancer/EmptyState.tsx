import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { T, PrimaryButton, useFlowPalette } from '@/components/community/freelancerFlow/shared';
import { SP, RADIUS } from './designTokens';

interface EmptyStateProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    ctaLabel?: string;
    onCtaPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCtaPress, style }: EmptyStateProps) {
    const { palette } = useFlowPalette();

    return (
        <View style={[styles.container, { backgroundColor: palette.card, borderColor: palette.borderLight }, style]}>
            <View style={[styles.iconWrap, { backgroundColor: palette.border }]}>
                <Ionicons name={icon} size={32} color={palette.subText} />
            </View>
            <T weight="bold" color={palette.text} style={styles.title}>
                {title}
            </T>
            <T weight="medium" color={palette.subText} style={styles.subtitle}>
                {subtitle}
            </T>
            {ctaLabel && onCtaPress && (
                <PrimaryButton label={ctaLabel} onPress={onCtaPress} style={styles.cta} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: SP._40,
        paddingHorizontal: SP._24,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        marginTop: SP._24,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SP._16,
    },
    title: {
        fontSize: 18,
        marginBottom: SP._8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SP._24,
    },
    cta: {
        paddingHorizontal: SP._24,
        paddingVertical: 12,
        borderRadius: RADIUS.md,
    },
});
