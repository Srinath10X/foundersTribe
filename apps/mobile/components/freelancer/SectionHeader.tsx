import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { T, useFlowPalette } from '@/components/community/freelancerFlow/shared';
import { SP, SCREEN_PADDING } from './designTokens';

interface SectionHeaderProps {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: object;
}

export function SectionHeader({ title, actionLabel, onAction, style }: SectionHeaderProps) {
    const { palette } = useFlowPalette();

    return (
        <View style={[styles.container, style]}>
            <T weight="bold" color={palette.text} style={styles.title}>
                {title}
            </T>
            {actionLabel && onAction && (
                <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <T weight="bold" color={palette.accent} style={styles.action}>
                        {actionLabel}
                    </T>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SP._16,
    },
    title: {
        fontSize: 22,
        letterSpacing: -0.5,
    },
    action: {
        fontSize: 15,
    },
});
