import { NewsArticleCard } from "@/components/NewsArticleCard";
import { Layout, Spacing, Typography } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

const { height: windowHeight } = Dimensions.get("window");
const STATUS_BAR_HEIGHT = Platform.OS === "ios" ? 54 : StatusBar.currentHeight || 24;
const HEADER_HEIGHT = 48;
const TOP_OFFSET = STATUS_BAR_HEIGHT + HEADER_HEIGHT;
const CARD_HEIGHT = windowHeight - TOP_OFFSET;

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

export default function BookmarksScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      if (!user) {
        setBookmarkedArticles([]);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const NEWS_SERVICE_URL =
        process.env.EXPO_PUBLIC_NEWS_SERVICE_URL || "http://192.168.0.19:3001";

      // ─── 1. Get bookmarked article IDs via API (bypasses RLS) ──────────
      let articleIds: (number | string)[] = [];

      if (session?.access_token) {
        try {
          const resp = await fetch(
            `${NEWS_SERVICE_URL}/api/user_bookmarked_articles`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (resp.ok) {
            const rows = await resp.json();
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
            }
          }
        } catch (e) {
          console.error("[Bookmarks] API fetch failed:", e);
        }
      }

      // ─── 2. Fallback: get bookmarked article IDs via Supabase ─────────
      if (articleIds.length === 0) {
        let interactions: InteractionRow[] | null = null;

        const r1 = await supabase
          .from("user_interactions")
          .select("article_id, updated_at")
          .eq("user_id", user.id)
          .eq("bookmarked", true)
          .order("updated_at", { ascending: false });
        interactions = (r1.data as InteractionRow[] | null) || null;

        if (!interactions || interactions.length === 0) {
          const r2 = await supabase
            .from("user_interactions")
            .select("article_id, created_at")
            .eq("user_id", user.id)
            .eq("bookmarked", true)
            .order("created_at", { ascending: false });
          interactions = (r2.data as InteractionRow[] | null) || null;
        }

        if (!interactions || interactions.length === 0) {
          const r3 = await supabase
            .from("user_interactions")
            .select("article_id")
            .eq("user_id", user.id)
            .eq("bookmarked", true);
          interactions = (r3.data as InteractionRow[] | null) || null;
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
        }
      }

      if (articleIds.length === 0) {
        setBookmarkedArticles([]);
        return;
      }

      // ─── 3. Fetch full article data for each bookmarked ID ────────────
      const fetchOneArticle = async (
        id: number | string,
      ): Promise<Article | null> => {
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
                    "Image URL": row["Image URL"] || row.image_url || null,
                    "Article Link": row["Article Link"] || row.article_link || "",
                    Category: row.Category || row.category || null,
                    "Company Name": row["Company Name"] || row.company_name || null,
                  };
                }
              }
            }
          } catch {
            // fall through to Supabase
          }
        }

        const articleSelect =
          'id, Title, Summary, Content, "Image URL", "Article Link", Category, "Company Name"';
        const { data } = await supabase
          .from("Articles")
          .select(articleSelect)
          .eq("id", id as any)
          .maybeSingle();

        if (data) return data as Article;

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

      if (articles.length > 0) {
        const orderMap = new Map(
          articleIds.map((id, idx) => [String(id), idx]),
        );
        const ordered = [...articles].sort((a, b) => {
          const ai = orderMap.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER;
          const bi = orderMap.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER;
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

  const BOTTOM_PADDING = Platform.OS === "ios" ? 50 : 44;

  const renderItem = ({ item }: { item: Article }) => (
    <View style={styles.cardWrapper}>
      <NewsArticleCard article={item} cardHeight={CARD_HEIGHT - BOTTOM_PADDING} />
      <View style={{ height: BOTTOM_PADDING }} />
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

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.background,
            borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Saved Collection
        </Text>
        <Text style={[styles.headerCount, { color: theme.text.tertiary }]}>
          {bookmarkedArticles.length} {bookmarkedArticles.length === 1 ? "article" : "articles"}
        </Text>
      </View>

      {bookmarkedArticles.length === 0 ? (
        <View style={styles.emptyContainer}>
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
      ) : (
        <FlatList
          data={bookmarkedArticles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={CARD_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.brand.primary}
              colors={[theme.brand.primary]}
              progressViewOffset={10}
            />
          }
          getItemLayout={(_data, index) => ({
            length: CARD_HEIGHT,
            offset: CARD_HEIGHT * index,
            index,
          })}
          extraData={CARD_HEIGHT}
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
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : (StatusBar.currentHeight || 24),
    height: (Platform.OS === "ios" ? 54 : (StatusBar.currentHeight || 24)) + HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    fontFamily: Typography.fonts.primary,
  },
  headerCount: {
    fontSize: 13,
    fontFamily: Typography.fonts.primary,
  },
  cardWrapper: {
    height: CARD_HEIGHT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
