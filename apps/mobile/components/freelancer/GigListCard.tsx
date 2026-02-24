/**
 * ============================================================
 * GIG LIST COMPONENT - Presentational component for displaying gigs
 * ============================================================
 * 
 * A card component optimized for displaying gig data from the API.
 * Supports all gig statuses and provides proper formatting.
 * 
 * Usage:
 * <GigCard
 *   gig={gigData}
 *   onPress={() => handleGigPress(gig.id)}
 * />
 * ============================================================
 */

import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { Badge, T, useFlowPalette } from '@/components/community/freelancerFlow/shared';
import { SP, RADIUS } from './designTokens';
import type { Gig, GigStatus } from '@/types/gig';

interface GigCardProps {
  gig: Gig;
  onPress?: () => void;
  onBookmark?: () => void;
  actionLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const STATUS_CONFIG: Record<GigStatus, { label: string; tone: 'success' | 'progress' | 'neutral' | 'danger' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  open: { label: 'Hiring', tone: 'success' },
  in_progress: { label: 'In Progress', tone: 'progress' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

function formatBudget(min: number, max: number, type: 'fixed' | 'hourly'): string {
  const prefix = type === 'hourly' ? '₹' : '₹';
  const suffix = type === 'hourly' ? '/hr' : '';
  if (min === max) {
    return `${prefix}${min.toLocaleString()}${suffix}`;
  }
  return `${prefix}${min.toLocaleString()} – ${prefix}${max.toLocaleString()}${suffix}`;
}

export const GigListCard = memo(function GigListCard({
  gig,
  onPress,
  onBookmark,
  actionLabel = 'View Details',
  style,
}: GigCardProps) {
  const { palette } = useFlowPalette();

  const statusConfig = STATUS_CONFIG[gig.status] || STATUS_CONFIG.draft;
  const tags = gig.gig_tags?.map(t => t.tags.label) || [];
  const budget = formatBudget(gig.budget_min, gig.budget_max, gig.budget_type);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={style}>
      <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
        {/* Header: badge + bookmark */}
        <View style={styles.header}>
          <View style={styles.badges}>
            <Badge label={statusConfig.label} tone={statusConfig.tone} />
          </View>
          {onBookmark && (
            <TouchableOpacity onPress={onBookmark} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="bookmark-outline" size={18} color={palette.subText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <T weight="bold" color={palette.text} style={styles.title} numberOfLines={2}>
          {gig.title}
        </T>

        {/* Budget */}
        <View style={styles.budgetRow}>
          <T weight="bold" color={palette.accent} style={styles.budgetValue}>
            {budget}
          </T>
          <T weight="semiBold" color={palette.subText} style={styles.budgetLabel}>
            {gig.budget_type === 'hourly' ? 'HOURLY' : 'BUDGET'}
          </T>
        </View>

        {/* Meta: experience level + remote */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="briefcase-outline" size={14} color={palette.subText} />
            <T weight="medium" color={palette.subText} style={styles.metaText}>
              {gig.experience_level === 'junior' ? 'Junior' : gig.experience_level === 'mid' ? 'Mid-Level' : 'Senior'}
            </T>
          </View>
          {gig.is_remote && (
            <View style={styles.metaItem}>
              <Ionicons name="globe-outline" size={14} color={palette.subText} />
              <T weight="medium" color={palette.subText} style={styles.metaText}>
                Remote
              </T>
            </View>
          )}
        </View>

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagRow}>
            {tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: palette.border }]}>
                <T weight="semiBold" color={palette.text} style={styles.tagText}>
                  {tag}
                </T>
              </View>
            ))}
            {tags.length > 3 && (
              <T weight="medium" color={palette.subText} style={styles.moreTag}>
                +{tags.length - 3}
              </T>
            )}
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        {/* Footer: proposals count + CTA */}
        <View style={styles.footer}>
          <T weight="semiBold" color={palette.subText} style={styles.proposals}>
            {gig.proposals_count} proposal{gig.proposals_count !== 1 ? 's' : ''}
          </T>
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SP._16,
    marginTop: SP._12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SP._4,
  },
  metaText: {
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
  moreTag: {
    fontSize: 11,
    alignSelf: 'center',
  },
  divider: {
    height: 1,
    marginVertical: SP._16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proposals: {
    fontSize: 14,
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
