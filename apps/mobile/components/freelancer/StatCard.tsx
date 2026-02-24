import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { T, useFlowPalette } from '@/components/community/freelancerFlow/shared';
import { SP, RADIUS, SHADOWS } from './designTokens';

interface StatCardProps {
    label: string;
    value: string | number;
    trend?: number; // percentage, positive = green arrow up
    trendLabel?: string;
    accentColor?: string;
    style?: StyleProp<ViewStyle>;
}

export function StatCard({ label, value, trend, trendLabel, accentColor, style }: StatCardProps) {
    const { palette } = useFlowPalette();
    const valueColor = accentColor || palette.text;

    return (
        <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.borderLight }, style]}>
            <View>
                <T weight="semiBold" color={palette.subText} style={styles.label} numberOfLines={1}>
                    {label}
                </T>
            </View>
            <View style={styles.bottomSection}>
                <T weight="bold" color={valueColor} style={styles.value} numberOfLines={1}>
                    {value}
                </T>
                {(trend !== undefined || trendLabel) && (
                    <View style={styles.trendRow}>
                        {trend !== undefined && (
                            <View style={[styles.trendPill, { backgroundColor: trend >= 0 ? 'rgba(95,168,118,0.15)' : 'rgba(255,59,48,0.12)' }]}>
                                <Ionicons
                                    name={trend >= 0 ? 'trending-up' : 'trending-down'}
                                    size={12}
                                    color={trend >= 0 ? palette.success : '#FF3B30'}
                                />
                                <T
                                    weight="bold"
                                    color={trend >= 0 ? palette.success : '#FF3B30'}
                                    style={styles.trendText}
                                >
                                    {trend >= 0 ? '+' : ''}{trend}%
                                </T>
                            </View>
                        )}
                        {trendLabel && (
                            <T weight="medium" color={palette.mutedText} style={styles.trendLabel} numberOfLines={1}>
                                {trendLabel}
                            </T>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minWidth: '45%',
        minHeight: 110,
        padding: SP._16,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    bottomSection: {
        marginTop: SP._8,
    },
    value: {
        fontSize: 26,
        letterSpacing: -0.6,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SP._8,
        marginTop: SP._8,
    },
    trendPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: SP._8,
        paddingVertical: 3,
        borderRadius: RADIUS.pill,
    },
    trendText: {
        fontSize: 11,
    },
    trendLabel: {
        fontSize: 11,
    },
});
