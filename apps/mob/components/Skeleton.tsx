import { Layout, Spacing } from '@/constants/DesignSystem';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const { theme, isDark } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.surface, // Dynamic background
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={isDark ? [
            'transparent',
            'rgba(255, 255, 255, 0.05)',
            'transparent',
          ] : [
            'transparent',
            'rgba(0, 0, 0, 0.05)', // Darker shimmer for light mode
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

export function ReelCardSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={styles.reelCard}>
      <Skeleton width="100%" height={9999} borderRadius={0} />
      <View style={styles.reelContent}>
        <Skeleton width="30%" height={12} style={{ marginBottom: Spacing.sm }} />
        <Skeleton width="90%" height={24} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="85%" height={24} style={{ marginBottom: Spacing.md }} />
        <Skeleton width="95%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="80%" height={16} />
      </View>
    </View>
  );
}

export function ArticleCardSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[styles.articleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Skeleton width="100%" height={200} borderRadius={Layout.radius.xl} />
      <View style={styles.articleContent}>
        <Skeleton width="25%" height={12} style={{ marginBottom: Spacing.sm }} />
        <Skeleton width="90%" height={20} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="85%" height={20} style={{ marginBottom: Spacing.md }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="70%" height={14} />
      </View>
    </View>
  );
}

export function SearchResultSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[styles.searchResult, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Skeleton width={100} height={100} borderRadius={Layout.radius.lg} />
      <View style={styles.searchContent}>
        <Skeleton width="30%" height={10} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="90%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="60%" height={14} />
      </View>
    </View>
  );
}

export function ProfileStatsSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={styles.statsContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Skeleton width={60} height={32} style={{ marginBottom: Spacing.xs }} />
          <Skeleton width={80} height={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  reelCard: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  reelContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
  },
  articleCard: {
    borderRadius: Layout.radius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  articleContent: {
    padding: Spacing.lg,
  },
  searchResult: {
    flexDirection: 'row',
    borderRadius: Layout.radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  searchContent: {
    flex: 1,
    padding: Spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: Layout.radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
});
