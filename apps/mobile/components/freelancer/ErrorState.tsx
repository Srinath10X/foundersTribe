import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T, PrimaryButton, useFlowPalette } from '@/components/community/freelancerFlow/shared';
import { SP, RADIUS } from './designTokens';

interface ErrorStateProps {
    title?: string;
    message?: string;
    retryLabel?: string;
    onRetry?: () => void;
    style?: StyleProp<ViewStyle>;
}

export function ErrorState({
    title = "Something went wrong",
    message = "We couldn't load this content. Please try again.",
    retryLabel = "Try Again",
    onRetry,
    style
}: ErrorStateProps) {
    const { palette } = useFlowPalette();

    return (
        <View style={[styles.container, { backgroundColor: palette.card, borderColor: palette.borderLight }, style]}>
            <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft || 'rgba(255,59,48,0.1)' }]}>
                <Ionicons name="alert-circle" size={32} color={palette.accent || '#FF3B30'} />
            </View>
            <T weight="bold" color={palette.text} style={styles.title}>
                {title}
            </T>
            <T weight="medium" color={palette.subText} style={styles.message}>
                {message}
            </T>
            {retryLabel && onRetry && (
                <PrimaryButton 
                    label={retryLabel} 
                    onPress={onRetry} 
                    style={styles.button}
                />
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
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SP._24,
    },
    button: {
        paddingHorizontal: SP._24,
        paddingVertical: 12,
        borderRadius: RADIUS.md,
    },
});
