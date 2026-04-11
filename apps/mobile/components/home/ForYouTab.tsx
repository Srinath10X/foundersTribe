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
  useWindowDimensions,
  View,
} from "react-native";

const TAB_BAR_TOTAL = Platform.OS === "ios" ? 80 : 72;
const MIN_CARD_HEIGHT = 420;

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

const getArticleIdentity = (article: Article) =>
  (article["Article Link"] || "").trim() || `${article.id}-${article.Title}`;

const dedupeArticles = (items: Article[]) => {
  const seen = new Set<string>();
  return items.filter((article) => {
    const key = getArticleIdentity(article);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const MIN_ARTICLE_BODY_LENGTH = 100;

const cleanArticleText = (value: string | null | undefined) => {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const filterReadableArticles = (items: Article[]) =>
  items.filter((article) => {
    const body = cleanArticleText(article.Content || article.Summary);
    return body.length >= MIN_ARTICLE_BODY_LENGTH;
  });

const PAGE_SIZE = 20;
const DEFAULT_TOP_CONTENT_OFFSET = Platform.OS === "ios" ? 116 : 96;

type ForYouTabProps = {
  topContentOffset?: number;
};

export default function ForYouTab({
  topContentOffset = DEFAULT_TOP_CONTENT_OFFSET,
}: ForYouTabProps) {
  const { theme, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const flatListRef = useRef<FlatList<Article>>(null);
  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const CARD_HEIGHT = Math.max(
    MIN_CARD_HEIGHT,
    windowHeight - topContentOffset - TAB_BAR_TOTAL,
  );

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
    const uniqueData = dedupeArticles(filterReadableArticles(data));
    setArticles(uniqueData);
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
    const uniqueData = dedupeArticles(filterReadableArticles(data));
    setArticles(uniqueData);
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
      const readableData = filterReadableArticles(data);
      setArticles((prev) => dedupeArticles([...prev, ...readableData]));
      pageRef.current += 1;
    }

    if (data.length < PAGE_SIZE) {
      updateHasMore(false);
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, []);

  const renderItem = ({ item }: { item: Article }) => (
    <View style={{ height: CARD_HEIGHT }}>
      <NewsArticleCard article={item} isForYou={true} cardHeight={CARD_HEIGHT} />
    </View>
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
        <View style={[styles.footerPage, { height: CARD_HEIGHT }]}>
          <View style={styles.footerLoading}>
            <ActivityIndicator color={theme.brand.primary} size="large" />
          </View>
        </View>
      );
    }

    if (!hasMore && articles.length > 0) {
      return (
        <View style={[styles.footerPage, { height: CARD_HEIGHT }]}>
          <View style={styles.footerContainer}>
            <View style={styles.footerContent}>
              <View
                style={[
                  styles.footerIconCircle,
                  {
                    backgroundColor: isDark
                      ? "rgba(207,32,48,0.1)"
                      : "rgba(207,32,48,0.08)",
                    borderColor: isDark
                      ? "rgba(207,32,48,0.25)"
                      : "rgba(207,32,48,0.15)",
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
          <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
            We hide very short updates to keep your feed clean. Pull to refresh
            for fuller stories.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, marginBottom: TAB_BAR_TOTAL }]}>
      <FlatList<Article>
        ref={flatListRef}
        data={articles}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${getArticleIdentity(item)}-${index}`}
        extraData={CARD_HEIGHT}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingTop: topContentOffset }]}
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.25}
        ListFooterComponent={EndOfFeedFooter}
        snapToInterval={CARD_HEIGHT}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
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
    paddingBottom: 0,
  },

  // Skeleton
  skeletonList: {
    paddingBottom: 20,
  },
  skeletonCard: {
    marginBottom: 14,
  },
  skeletonInner: {
    overflow: "hidden",
  },
  skeletonImage: {
    width: "100%",
    height: 210,
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
  footerPage: {
    justifyContent: "center",
  },
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
