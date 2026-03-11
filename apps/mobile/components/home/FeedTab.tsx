import { NewsArticleCard } from "@/components/NewsArticleCard";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
const DEFAULT_TOP_CONTENT_OFFSET = Platform.OS === "ios" ? 116 : 96;

type FeedTabProps = {
  topContentOffset?: number;
};

export default function FeedTab({
  topContentOffset = DEFAULT_TOP_CONTENT_OFFSET,
}: FeedTabProps) {
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

  const renderItem = ({ item }: { item: Article }) => (
    <NewsArticleCard article={item} />
  );

  // Skeleton for loading state — card-list style
  const SkeletonCard = () => (
    <View style={styles.skeletonCard}>
      <View
        style={[
          styles.skeletonInner,
          {
            backgroundColor: isDark ? "#151517" : "#FFFFFF",
          },
        ]}
      >
        <View
          style={[
            styles.skeletonImage,
            { backgroundColor: isDark ? "#1a1a1a" : "#e5e5e7" },
          ]}
        />
        <View style={styles.skeletonContent}>
          <View
            style={[
              styles.skeletonLine,
              {
                backgroundColor: isDark ? "#1f1f23" : "#f0f0f0",
                width: 100,
                height: 14,
              },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              {
                backgroundColor: isDark ? "#1f1f23" : "#f0f0f0",
                width: "100%",
                height: 18,
              },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              {
                backgroundColor: isDark ? "#1f1f23" : "#f0f0f0",
                width: "75%",
                height: 18,
              },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              {
                backgroundColor: isDark ? "#1f1f23" : "#f0f0f0",
                width: "100%",
                height: 13,
              },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              {
                backgroundColor: isDark ? "#1f1f23" : "#f0f0f0",
                width: 140,
                height: 12,
                marginTop: 6,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );

  const EndOfFeedFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator color={theme.brand.primary} size="large" />
        </View>
      );
    }

    if (!hasMore && articles.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <View style={styles.footerContent}>
            <View
              style={[
                styles.footerIconCircle,
                {
                  backgroundColor: isDark
                    ? "rgba(255,59,48,0.1)"
                    : "rgba(255,59,48,0.08)",
                  borderColor: isDark
                    ? "rgba(255,59,48,0.25)"
                    : "rgba(255,59,48,0.15)",
                },
              ]}
            >
              <Ionicons
                name="checkmark-done"
                size={36}
                color={theme.brand.primary}
              />
            </View>
            <Text style={[styles.footerTitle, { color: theme.text.primary }]}>
              All caught up!
            </Text>
            <Text
              style={[styles.footerSubtitle, { color: theme.text.tertiary }]}
            >
              You&apos;ve seen every story in your feed.{"\n"}Pull down to
              refresh for new articles.
            </Text>
            <TouchableOpacity
              style={[
                styles.footerButton,
                { backgroundColor: theme.brand.primary },
              ]}
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
        <View style={[styles.skeletonList, { paddingTop: topContentOffset }]}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (articles.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
              },
            ]}
          >
            <Ionicons
              name="newspaper-outline"
              size={48}
              color={theme.text.muted}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
            No articles yet
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: theme.text.tertiary }]}
          >
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
        contentContainerStyle={[styles.listContent, { paddingTop: topContentOffset }]}
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.5}
        ListFooterComponent={EndOfFeedFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.brand.primary}
            colors={[theme.brand.primary]}
          />
        }
        removeClippedSubviews={Platform.OS === "android"}
        maxToRenderPerBatch={5}
        windowSize={7}
        initialNumToRender={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },

  // Skeleton
  skeletonList: {
    paddingBottom: 20,
  },
  skeletonCard: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  skeletonInner: {
    borderRadius: 16,
    overflow: "hidden",
  },
  skeletonImage: {
    width: "100%",
    height: 180,
  },
  skeletonContent: {
    padding: 16,
    gap: 8,
  },
  skeletonLine: {
    borderRadius: 4,
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

  // Footer
  footerLoading: {
    paddingVertical: 32,
    alignItems: "center",
  },
  footerContainer: {
    paddingVertical: 48,
    alignItems: "center",
  },
  footerContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  footerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  footerTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  footerSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
    fontFamily: "Poppins_400Regular",
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  footerButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
});
