/**
 * CONTEXT INDICATOR PILL
 * Minimal metadata badges for intelligence reels
 */

import { Colors, Spacing, Type } from '@/constants/DesignSystem';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ContextIndicatorPillProps {
  label: string;
  isDark?: boolean;
}

export function ContextIndicatorPill({ label, isDark = true }: ContextIndicatorPillProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.accentSubtle }]}>
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: 6,
  },
  text: {
    ...Type.metadata,
  },
});
