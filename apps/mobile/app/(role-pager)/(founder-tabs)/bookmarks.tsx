import { ArticleReelCard } from "@/components/ArticleReelCard";
import { Layout, Spacing, Typography } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

const { height: windowHeight } = Dimensions.get("window");
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 70;
const HEADER_HEIGHT = Platform.OS === "ios" ? 140 : 120; // Slightly more for better gradient fade

const REEL_HEIGHT = windowHeight - TAB_BAR_HEIGHT;

interface Article {
  id: number;
  Title: string;
  Summary: string;
  Content: string;
  "Image URL": string | null;
  "Article Link": string;
  Category: string | null;
  "Company Name": string | null;
}

type InteractionRow = {
  article_id: number | string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Article>);

export default function BookmarksScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      fetchBookmarkedArticles();
    }, []),
  );

  const fetchBookmarkedArticles = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("[Bookmarks] user:", user?.id);
      if (!user) {
        console.log("[Bookmarks] No user, returning empty");
        setBookmarkedArticles([]);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const NEWS_SERVICE_URL =
        process.env.EXPO_PUBLIC_NEWS_SERVICE_URL || "http://192.168.0.19:3001";
      console.log("[Bookmarks] API URL:", NEWS_SERVICE_URL);

      // ─── 1. Get bookmarked article IDs via API (bypasses RLS) ──────────
      let articleIds: (number | string)[] = [];

      if (session?.access_token) {
        try {
          console.log("[Bookmarks] Calling user_bookmarked_articles API...");
          const resp = await fetch(
            `${NEWS_SERVICE_URL}/api/user_bookmarked_articles`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
            },
          );
          console.log("[Bookmarks] API status:", resp.status);

          if (resp.ok) {
            const rows = await resp.json();
            console.log("[Bookmarks] API rows count:", Array.isArray(rows) ? rows.length : "not array", "data:", JSON.stringify(rows?.slice(0, 3)));
            if (Array.isArray(rows)) {
              articleIds = Array.from(
                new Set(
                  rows
                    .map((r: any) => r?.article_id)
                    .filter(
                      (id: any): id is number | string =>
                        id !== null && id !== undefined,
                    ),
                ),
              );
              console.log("[Bookmarks] articleIds from API:", articleIds);
            }
          } else {
            const errText = await resp.text().catch(() => "");
            console.log("[Bookmarks] API error body:", errText);
          }
        } catch (e) {
          console.error("[Bookmarks] API fetch failed:", e);
        }
      } else {
        console.log("[Bookmarks] No access token available");
      }

      // ─── 2. Fallback: get bookmarked article IDs via Supabase ─────────
      if (articleIds.length === 0) {
        console.log("[Bookmarks] No articleIds from API, trying Supabase...");
        let interactions: InteractionRow[] | null = null;

        // Try ordered by updated_at
        const r1 = await supabase
          .from("user_interactions")
          .select("article_id, updated_at")
          .eq("user_id", user.id)
          .eq("bookmarked", true)
          .order("updated_at", { ascending: false });
        interactions = (r1.data as InteractionRow[] | null) || null;
        console.log("[Bookmarks] Supabase r1:", r1.data?.length, "error:", r1.error?.message);

        // Fallback: ordered by created_at
        if (!interactions || interactions.length === 0) {
          const r2 = await supabase
            .from("user_interactions")
            .select("article_id, created_at")
            .eq("user_id", user.id)
            .eq("bookmarked", true)
            .order("created_at", { ascending: false });
          interactions = (r2.data as InteractionRow[] | null) || null;
          console.log("[Bookmarks] Supabase r2:", r2.data?.length, "error:", r2.error?.message);
        }

        // Fallback: no ordering
        if (!interactions || interactions.length === 0) {
          const r3 = await supabase
            .from("user_interactions")
            .select("article_id")
            .eq("user_id", user.id)
            .eq("bookmarked", true);
          interactions = (r3.data as InteractionRow[] | null) || null;
          console.log("[Bookmarks] Supabase r3:", r3.data?.length, "error:", r3.error?.message);
        }

        if (interactions && interactions.length > 0) {
          articleIds = Array.from(
            new Set(
              interactions
                .map((i) => i?.article_id)
                .filter(
                  (id): id is number | string =>
                    id !== null && id !== undefined,
                ),
            ),
          );
          console.log("[Bookmarks] articleIds from Supabase:", articleIds);
        }
      }

      console.log("[Bookmarks] Final articleIds count:", articleIds.length);
      if (articleIds.length === 0) {
        console.log("[Bookmarks] No bookmarks found, showing empty state");
        setBookmarkedArticles([]);
        return;
      }

      // ─── 3. Fetch full article data for each bookmarked ID ────────────
      const fetchOneArticle = async (
        id: number | string,
      ): Promise<Article | null> => {
        // Try API first
        if (session?.access_token) {
          try {
            const resp = await fetch(
              `${NEWS_SERVICE_URL}/api/article_by_id?article_id=${encodeURIComponent(String(id))}`,
              {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (resp.ok) {
              const payload = await resp.json();
              const row = Array.isArray(payload)
                ? payload[0]
                : Array.isArray(payload?.data)
                  ? payload.data[0]
                  : payload?.data || payload;

              if (row && typeof row === "object") {
                const articleId = Number(row.id);
                if (Number.isFinite(articleId)) {
                  return {
                    id: articleId,
                    Title: row.Title || row.title || "",
                    Summary: row.Summary || row.summary || "",
                    Content: row.Content || row.content || "",
                    "Image URL":
                      row["Image URL"] || row.image_url || null,
                    "Article Link":
                      row["Article Link"] || row.article_link || "",
                    Category: row.Category || row.category || null,
                    "Company Name":
                      row["Company Name"] || row.company_name || null,
                  };
                }
              }
            }
          } catch {
            // fall through to Supabase
          }
        }

        // Fallback: Supabase direct query
        const articleSelect =
          'id, Title, Summary, Content, "Image URL", "Article Link", Category, "Company Name"';
        const { data } = await supabase
          .from("Articles")
          .select(articleSelect)
          .eq("id", id as any)
          .maybeSingle();

        if (data) return data as Article;

        // Lowercase table fallback
        const lowerSelect =
          "id, title, summary, content, image_url, article_link, category, company_name";
        const { data: lowerData } = await supabase
          .from("articles")
          .select(lowerSelect)
          .eq("id", id as any)
          .maybeSingle();

        if (lowerData) {
          const row = lowerData as any;
          return {
            id: Number(row.id),
            Title: row.title || "",
            Summary: row.summary || "",
            Content: row.content || "",
            "Image URL": row.image_url || null,
            "Article Link": row.article_link || "",
            Category: row.category || null,
            "Company Name": row.company_name || null,
          };
        }

        return null;
      };

      const articles = (
        await Promise.all(articleIds.map(fetchOneArticle))
      ).filter((a): a is Article => a !== null);

      console.log("[Bookmarks] Resolved articles count:", articles.length);

      if (articles.length > 0) {
        // Keep same order as bookmarked interactions
        const orderMap = new Map(
          articleIds.map((id, idx) => [String(id), idx]),
        );
        const ordered = [...articles].sort((a, b) => {
          const ai =
            orderMap.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER;
          const bi =
            orderMap.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER;
          return ai - bi;
        });
        setBookmarkedArticles(ordered);
      } else {
        setBookmarkedArticles([]);
      }
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      setBookmarkedArticles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRefreshing(true);
    await fetchBookmarkedArticles(true);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const renderItem = ({ item }: { item: Article }) => (
    <View style={{ height: REEL_HEIGHT }}>
      <ArticleReelCard article={item} />
    </View>
  );

  const ReachedEndFooter = () => (
    <View
      style={[styles.footerContainer, { backgroundColor: theme.background }]}
    >
      <View style={styles.footerContent}>
        <Ionicons
          name="checkmark-circle-outline"
          size={48}
          color={theme.brand.primary}
        />
        <Text style={[styles.footerTitle, { color: theme.text.primary }]}>
          End of Collection
        </Text>
        <Text style={[styles.footerSubtitle, { color: theme.text.tertiary }]}>
          You&apos;ve seen all your bookmarked articles.
        </Text>
        <TouchableOpacity
          style={[styles.exploreBtn, { backgroundColor: theme.brand.primary }]}
          onPress={() => router.push("/(role-pager)/(founder-tabs)/home")}
        >
          <Text style={[styles.exploreBtnText, { color: theme.text.inverse }]}>
            Discover More
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View
      style={[styles.emptyContainer, { backgroundColor: theme.background }]}
    >
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Ionicons name="bookmark-outline" size={80} color={theme.text.muted} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
        No saved articles
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
        You haven&apos;t bookmarked any articles yet.
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: theme.brand.primary }]}
        onPress={() => router.push("/(role-pager)/(founder-tabs)/home")}
        activeOpacity={0.7}
      >
        <Text style={[styles.emptyButtonText, { color: theme.text.inverse }]}>
          Explore Articles
        </Text>
        <Ionicons name="arrow-forward" size={18} color={theme.text.inverse} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Overlay Header at top */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={["rgba(0,0,0,0.8)", "rgba(0,0,0,0.4)", "transparent"]}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.headerTitle}>Saved Collection</Text>
      </View>

      {bookmarkedArticles.length === 0 ? (
        <EmptyState />
      ) : (
        <AnimatedFlatList
          data={bookmarkedArticles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={REEL_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          ListFooterComponent={ReachedEndFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.brand.primary}
              colors={[theme.brand.primary]}
              progressViewOffset={10}
            />
          }
          getItemLayout={(data, index) => ({
            length: REEL_HEIGHT,
            offset: REEL_HEIGHT * index,
            index,
          })}
          removeClippedSubviews={Platform.OS === "android"}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: Typography.fonts.primary,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  goldLine: {
    width: 40,
    height: 2,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footerContainer: {
    height: REEL_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  footerContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  footerTitle: {
    ...Typography.presets.h3,
    marginTop: 20,
    fontFamily: Typography.fonts.primary,
  },
  footerSubtitle: {
    ...Typography.presets.body,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreBtnText: {
    fontWeight: "700",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxxl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    borderWidth: 1,
  },
  emptyTitle: {
    ...Typography.presets.h2,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    ...Typography.presets.body,
    textAlign: "center",
    marginBottom: Spacing.xxl,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Layout.radius.full,
    gap: Spacing.sm,
  },
  emptyButtonText: {
    ...Typography.presets.body,
    fontWeight: "700",
  },
});
