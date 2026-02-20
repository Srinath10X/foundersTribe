import { ArticleReelCard } from "@/components/ArticleReelCard";
import { Layout, Spacing, Typography } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 70;
const SUB_TAB_BAR_HEIGHT = 0;

const REEL_HEIGHT = windowHeight - TAB_BAR_HEIGHT - SUB_TAB_BAR_HEIGHT;

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

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Article>);

export default function LibraryTab() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);

  useEffect(() => {
    fetchBookmarkedArticles();
  }, []);

  const fetchBookmarkedArticles = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: interactions } = await supabase
        .from("user_interactions")
        .select("article_id")
        .eq("user_id", user.id)
        .eq("bookmarked", true);

      if (!interactions || interactions.length === 0) {
        setBookmarkedArticles([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const articleIds = interactions.map((i) => i.article_id);

      const { data: articles } = await supabase
        .from("Articles")
        .select(
          'id, Title, Summary, Content, "Image URL", "Article Link", Category, "Company Name"'
        )
        .in("id", articleIds);

      if (articles) {
        setBookmarkedArticles(articles);
      }
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
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
      <ArticleReelCard article={item} height={REEL_HEIGHT} />
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
        <Text
          style={[styles.footerSubtitle, { color: theme.text.tertiary }]}
        >
          You've seen all your bookmarked articles.
        </Text>
        <TouchableOpacity
          style={[
            styles.exploreBtn,
            { backgroundColor: theme.brand.primary },
          ]}
          onPress={() => router.push("/(founder-tabs)/home")}
        >
          <Text
            style={[
              styles.exploreBtnText,
              { color: theme.text.inverse },
            ]}
          >
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
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons
          name="bookmark-outline"
          size={80}
          color={theme.text.muted}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
        No saved articles
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
        You haven't bookmarked any articles yet.
      </Text>
      <TouchableOpacity
        style={[
          styles.emptyButton,
          { backgroundColor: theme.brand.primary },
        ]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.emptyButtonText,
            { color: theme.text.inverse },
          ]}
        >
          Explore Articles
        </Text>
        <Ionicons
          name="arrow-forward"
          size={18}
          color={theme.text.inverse}
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {bookmarkedArticles.length === 0 ? (
        <EmptyState />
      ) : (
        <AnimatedFlatList
          data={bookmarkedArticles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
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
    height: windowHeight - TAB_BAR_HEIGHT,
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
