import { ArticleReelCard } from "@/components/ArticleReelCard";
import { ReelCardSkeleton } from "@/components/Skeleton";
import { Layout } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 70;
const SUB_TAB_BAR_HEIGHT = 0;

const REEL_WIDTH =
  Platform.OS === "web"
    ? Math.min(windowWidth, Layout.webMaxWidth)
    : windowWidth;
const REEL_HEIGHT =
  Platform.OS === "web"
    ? Math.min(windowHeight, Layout.webMaxHeight)
    : windowHeight - TAB_BAR_HEIGHT - SUB_TAB_BAR_HEIGHT;

interface Article {
  id: number;
  Title: string;
  Content: string | null;
  "Image URL": string | null;
  "Company Name": string | null;
  "Article Link": string | null;
  Category: string | null;
  Summary: string | null;
}

const PAGE_SIZE = 20;

export default function FeedTab() {
  const { theme, isDark } = useTheme();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const flatListRef = useRef<FlatList<Article>>(null);
  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const updateHasMore = (value: boolean) => {
    hasMoreRef.current = value;
    setHasMore(value);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    pageRef.current = 0;
    updateHasMore(true);
    const data = await fetchArticles(0);
    setArticles(data);
    if (data.length < PAGE_SIZE) updateHasMore(false);
    if (data.length > 0) pageRef.current = 1;
    setLoading(false);
  };

  const fetchArticles = async (page: number): Promise<Article[]> => {
    const NEWS_SERVICE_URL =
      process.env.EXPO_PUBLIC_NEWS_SERVICE_URL || "http://192.168.0.19:3001";
    const offset = page * PAGE_SIZE;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No auth token");

      const response = await fetch(
        `${NEWS_SERVICE_URL}/api/personalized_articles?offset=${offset}&limit=${PAGE_SIZE}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch articles");
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error("Error fetching articles:", error);
      return [];
    }
  };

  const handleRefresh = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRefreshing(true);
    pageRef.current = 0;
    updateHasMore(true);
    const data = await fetchArticles(0);
    setArticles(data);
    updateHasMore(data.length >= PAGE_SIZE);
    if (data.length > 0) pageRef.current = 1;
    setRefreshing(false);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const loadNextPage = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const data = await fetchArticles(pageRef.current);
    if (data.length > 0) {
      setArticles((prev) => [...prev, ...data]);
      pageRef.current += 1;
    }
    if (data.length < PAGE_SIZE) {
      updateHasMore(false);
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, []);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const distanceFromEnd =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      // When within 2 reel heights of the end, load more
      if (distanceFromEnd < REEL_HEIGHT * 2) {
        loadNextPage();
      }
    },
    [loadNextPage]
  );

  const renderItem = ({ item }: { item: Article; index: number }) => (
    <View style={{ height: REEL_HEIGHT }}>
      <ArticleReelCard article={item} height={REEL_HEIGHT} />
    </View>
  );

  const EndOfFeedFooter = () => {
    if (loadingMore) {
      return (
        <View style={[styles.footerContainer, { backgroundColor: "#000" }]}>
          <ActivityIndicator color="#FF0000" size="large" />
        </View>
      );
    }

    if (!hasMore && articles.length > 0) {
      return (
        <View style={[styles.footerContainer, { backgroundColor: "#000" }]}>
          <LinearGradient
            colors={["#1a0000", "#000000", "#0a0a0a"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.footerContent}>
            <View style={styles.footerIconCircle}>
              <Ionicons name="checkmark-done" size={44} color="#FF0000" />
            </View>
            <View style={styles.footerCategoryPill}>
              <Text style={styles.footerCategoryText}>ALL CAUGHT UP</Text>
            </View>
            <Text style={styles.footerTitle}>All Articles Complete</Text>
            <Text style={styles.footerSubtitle}>
              You've seen every story in your feed.{"\n"}Pull down to refresh for new articles.
            </Text>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={handleRefresh}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.footerButtonText}>Refresh Feed</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.skeletonContainer}>
          <ReelCardSkeleton />
        </View>
      </View>
    );
  }

  if (articles.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
            <Ionicons name="newspaper-outline" size={48} color={theme.text.muted} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
            No articles yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
            Edit your interests to see personalized content
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList<Article>
        ref={flatListRef}
        data={articles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={REEL_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        ListFooterComponent={EndOfFeedFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF0000"
            colors={["#FF0000"]}
          />
        }
        getItemLayout={(_, index) => ({
          length: REEL_HEIGHT,
          offset: REEL_HEIGHT * index,
          index,
        })}
        removeClippedSubviews={Platform.OS === "android"}
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
  },
  skeletonContainer: {
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    fontFamily: "Poppins_700Bold",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  // End-of-Feed Footer (Reel-style)
  footerContainer: {
    height: REEL_HEIGHT,
    width: REEL_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  footerContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  footerIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,0,0,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  footerCategoryPill: {
    backgroundColor: "#FF0000",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 16,
  },
  footerCategoryText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  footerTitle: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footerSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Poppins_400Regular",
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FF0000",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  footerButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
});
