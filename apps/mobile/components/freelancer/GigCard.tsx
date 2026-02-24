import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { Badge, T, useFlowPalette } from '@/components/community/freelancerFlow/shared';
import { SP, RADIUS, SHADOWS } from './designTokens';

interface GigCardProps {
    title: string;
    company: string;
    status: string;
    statusTone: 'success' | 'progress' | 'neutral' | 'danger';
    budget?: number;
    deadline?: string;
    isUrgent?: boolean;
    tags?: string[];
    onPress?: () => void;
    onBookmark?: () => void;
    actionLabel?: string;
    style?: StyleProp<ViewStyle>;
}

export const GigCard = memo(function GigCard({
    title,
    company,
    status,
    statusTone,
    budget,
    deadline,
    isUrgent,
    tags,
    onPress,
    onBookmark,
    actionLabel = 'View Details',
    style,
}: GigCardProps) {
    const { palette } = useFlowPalette();

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const diff = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return 'Overdue';
        if (diff === 0) return 'Due today';
        return `Due in ${diff}d`;
    };

    const timeStr = formatTime(deadline);

    return (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={style}>
            <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
                {/* Header: badge + bookmark */}
                <View style={styles.header}>
                    <View style={styles.badges}>
                        {isUrgent && <Badge label="Urgent" tone="danger" />}
                        <Badge label={status} tone={statusTone} />
                    </View>
                    {onBookmark && (
                        <TouchableOpacity onPress={onBookmark} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="bookmark-outline" size={18} color={palette.subText} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Title & Price */}
                <T weight="bold" color={palette.text} style={styles.title} numberOfLines={2}>
                    {title}
                </T>
                {budget !== undefined && (
                    <View style={styles.budgetRow}>
                        <T weight="bold" color={palette.accent} style={styles.budgetValue}>
                            ₹{budget.toLocaleString()}
                        </T>
                        <T weight="semiBold" color={palette.subText} style={styles.budgetLabel}>
                            BUDGET
                        </T>
                    </View>
                )}

                {/* Meta */}
                <View style={styles.metaRow}>
                    <Ionicons name="business-outline" size={14} color={palette.subText} />
                    <T weight="medium" color={palette.subText} style={styles.meta}>
                        {company}
                    </T>
                    {timeStr && (
                        <T weight="medium" color={palette.subText} style={styles.meta}>
                            • {timeStr}
                        </T>
                    )}
                </View>

                {/* Tags */}
                {tags && tags.length > 0 && (
                    <View style={styles.tagRow}>
                        {tags.map((tag) => (
                            <View key={tag} style={[styles.tag, { backgroundColor: palette.border }]}>
                                <T weight="semiBold" color={palette.text} style={styles.tagText}>
                                    {tag}
                                </T>
                            </View>
                        ))}
                    </View>
                )}

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: palette.border }]} />

                {/* Footer: CTA */}
                <View style={styles.footer}>
                    <View style={{ flex: 1 }} />
                    {onPress && (
                        <TouchableOpacity
                            style={[styles.cta, { backgroundColor: palette.accent }]}
                            onPress={onPress}
                            activeOpacity={0.85}
                        >
                            <T weight="bold" color="#fff" style={styles.ctaText}>
                                {actionLabel}
                            </T>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        padding: SP._16,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badges: {
        flexDirection: 'row',
        gap: SP._8,
    },
    title: {
        fontSize: 16,
        lineHeight: 22,
        letterSpacing: -0.2,
        marginTop: SP._12,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SP._8,
        marginTop: SP._12,
    },
    meta: {
        fontSize: 13,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SP._8,
        marginTop: SP._16,
    },
    tag: {
        borderRadius: RADIUS.pill,
        paddingHorizontal: SP._12,
        paddingVertical: 6,
    },
    tagText: {
        fontSize: 11,
    },
    divider: {
        height: 1,
        marginVertical: SP._16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    budgetRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: SP._8,
        marginTop: SP._8,
    },
    budgetLabel: {
        fontSize: 11,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    budgetValue: {
        fontSize: 18,
        letterSpacing: -0.2,
    },
    cta: {
        borderRadius: RADIUS.md,
        paddingHorizontal: SP._20,
        paddingVertical: SP._12,
    },
    ctaText: {
        fontSize: 14,
    },
});
