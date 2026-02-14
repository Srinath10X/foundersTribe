import { ArticleReelCard } from '@/components/ArticleReelCard';
import { ReelCardSkeleton } from '@/components/Skeleton';
import { Layout, Spacing, Typography } from '@/constants/DesignSystem';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, Platform, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue
} from 'react-native-reanimated';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 70;

const REEL_WIDTH = Platform.OS === 'web' ? Math.min(windowWidth, Layout.webMaxWidth) : windowWidth;
const REEL_HEIGHT = Platform.OS === 'web' 
  ? Math.min(windowHeight, Layout.webMaxHeight) 
  : windowHeight - TAB_BAR_HEIGHT;

interface Article {
  id: number;
  Title: string;
  Content: string | null;
  'Image URL': string | null;
  'Company Name': string | null;
  'Article Link': string | null;
  Category: string | null;
  Summary: string | null;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Article>);

export default function HomeFeed() {
  const { theme, isDark } = useTheme();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // -- Data Fetching --
  const fetchInitialData = async () => {
    setLoading(true);
    await fetchArticles();
    setLoading(false);
  };

  const fetchArticles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get User Interests
      const { data: interestData } = await supabase
        .from('user_interests')
        .select('selected_interests')
        .eq('user_id', user.id)
        .single();

      const interests = interestData?.selected_interests || [];

      // 2. Query Articles (Filtered by Interests if available)
      let query = supabase
        .from('Articles')
        .select('*')
        .order('id', { ascending: false });

      if (interests.length > 0) {
        query = query.in('Category', interests);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  // -- Refresh Control --
  const handleRefresh = useCallback(async () => {
    // Haptic feedback for pull-to-refresh feel
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRefreshing(true);
    await fetchArticles();
    setRefreshing(false);
  }, []);

  // -- Scroll Handling for Animations --
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const renderItem = ({ item, index }: { item: Article; index: number }) => (
    <ArticleReelCard article={item} />
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <ReelCardSkeleton />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Stack.Screen options={{ headerShown: false }} />
        {renderSkeleton()}
      </View>
    );
  }

  if (articles.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No articles yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
            Edit your interests to see personalized content
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Immersive Header Overlay with Gradient Scrim */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={[styles.headerContent, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
            <Text style={[styles.headerLogo, { color: '#FFFFFF' }]}>foundersTribe</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="search" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
        </View>
      </View>

      <AnimatedFlatList
        data={articles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        // -- Paging Logic --
        pagingEnabled // Snaps to each item
        showsVerticalScrollIndicator={false}
        snapToInterval={REEL_HEIGHT} // Height of one card
        snapToAlignment="start"
        decelerationRate="fast" // Snap happens quickly
        // -- Animation Connection --
        onScroll={scrollHandler}
        scrollEventThrottle={16} // 60fps updates
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
            progressViewOffset={ Platform.OS === 'ios' ? 100 : 80 } // Push loader below header
          />
        }
        // -- Optimization --
        getItemLayout={(data, index) => ({
          length: REEL_HEIGHT,
          offset: REEL_HEIGHT * index,
          index,
        })}
        removeClippedSubviews={Platform.OS === 'android'} // Improve memory on Android
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Background color handled dynamically in component
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    zIndex: 100,
    height: Platform.OS === 'ios' ? 120 : 90, // Covers status bar + header area
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    width: '100%',
  },
  headerLogo: {
    fontSize: 22,
    fontFamily: 'BricolageGrotesque_700Bold', // Brand font
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  skeletonContainer: {
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  emptyTitle: {
    ...Typography.presets.h2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.presets.body,
    textAlign: 'center',
  },
});
