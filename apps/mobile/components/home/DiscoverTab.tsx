import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const RECENT_SEARCHES_KEY = "@recent_searches";
const MAX_RECENT_SEARCHES = 3;

const S = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

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

const getReadTimeMinutes = (article: Article) => {
  const text = `${article.Content || ""} ${article.Summary || ""}`.trim();
  const words = text ? text.split(/\s+/).length : 0;
  if (words === 0) return 5;
  return Math.max(1, Math.round(words / 180));
};

const getCategoryColor = (category: string | null, isDarkMode: boolean) => {
  const key = (category || "").toLowerCase();
  if (key.includes("payment")) return isDarkMode ? "#ff8c7f" : "#D04A3A";
  if (key.includes("lending")) return isDarkMode ? "#84bbff" : "#3E81B4";
  if (key.includes("ai")) return isDarkMode ? "#7ec4ff" : "#4B83C7";
  if (key.includes("global")) return isDarkMode ? "#c0cad8" : "#7E8898";
  return isDarkMode ? "#c7ced9" : "#6E7785";
};

const SearchBar = memo(function SearchBar({
  query,
  onChangeQuery,
  onSubmit,
  onClear,
}: {
  query: string;
  onChangeQuery: (q: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const scale = useSharedValue(1);

  const barBg = isDark
    ? (isFocused ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)")
    : (isFocused ? "rgba(0,0,0,0.045)" : "rgba(0,0,0,0.025)");
  const barBorder = isDark
    ? (isFocused ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)")
    : (isFocused ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)");

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={searchStyles.container}>
      <Animated.View style={animatedContainerStyle}>
        <View
          style={[
            searchStyles.inputContainer,
            {
              backgroundColor: barBg,
              borderColor: barBorder,
            },
          ]}
        >
          <View style={searchStyles.iconContainer}>
            <Ionicons
              name="search"
              size={18}
              color={isFocused ? theme.brand.primary : theme.text.tertiary}
            />
          </View>

          <TextInput
            style={[
              searchStyles.input,
              { color: theme.text.primary },
            ]}
            placeholder="Search articles..."
            placeholderTextColor={theme.text.muted}
            value={query}
            onChangeText={onChangeQuery}
            returnKeyType="search"
            onSubmitEditing={onSubmit}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            underlineColorAndroid="transparent"
          />

          {query.length > 0 ? (
            <Pressable
              onPress={onClear}
              hitSlop={8}
              style={searchStyles.clearButton}
            >
              <View
                style={[
                  searchStyles.clearIconBg,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.08)",
                  },
                ]}
              >
                <Ionicons
                  name="close"
                  size={12}
                  color={theme.text.tertiary}
                />
              </View>
            </Pressable>
          ) : (
            <View style={searchStyles.aiBadge}>
              <Ionicons
                name="sparkles"
                size={11}
                color={theme.brand.primary}
              />
              <Text style={[searchStyles.aiText, { color: theme.brand.primary }]}>
                AI
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

const searchStyles = StyleSheet.create({
  container: {
    paddingHorizontal: S.lg,
    marginBottom: S.md,
    zIndex: 101,
    elevation: 101,
    position: "relative",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: S.sm,
    height: 52,
    borderWidth: 1,
    gap: S.xs,
    overflow: "hidden",
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
    letterSpacing: -0.1,
  },
  clearButton: {
    padding: 4,
  },
  clearIconBg: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  aiText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.3,
  },
});

const CategoryPillItem = memo(function CategoryPillItem({
  label,
  isActive,
  onPress,
  isDark,
  theme,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
  theme: any;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const activeBg = isDark
    ? "rgba(255,59,48,0.15)"
    : "rgba(255,59,48,0.1)";
  const activeBorder = isDark
    ? "rgba(255,59,48,0.3)"
    : "rgba(255,59,48,0.2)";
  const inactiveBg = isDark
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.03)";
  const inactiveBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.06)";

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
    >
      <Animated.View
        style={[
          pillStyles.pill,
          {
            backgroundColor: isActive ? activeBg : inactiveBg,
            borderColor: isActive ? activeBorder : inactiveBorder,
          },
          animatedStyle,
        ]}
      >
        <Text
          style={[
            pillStyles.pillText,
            {
              color: isActive ? theme.brand.primary : theme.text.secondary,
              fontFamily: isActive ? "Poppins_600SemiBold" : "Poppins_400Regular",
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: S.md,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: S.xs,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  pillText: {
    fontSize: 13,
    letterSpacing: 0,
  },
});

const FeaturedCard = memo(function FeaturedCard({
  article,
  onPress,
}: {
  article: Article;
  onPress: () => void;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const category = (article.Category || "Payments").toUpperCase();
  const readTime = getReadTimeMinutes(article);
  const categoryColor = getCategoryColor(article.Category, isDark);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardBg = isDark ? theme.surface : "#F4F7FB";
  const cardBorder = isDark ? theme.border : "#E8EDF5";

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.985, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
    >
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[
          featuredStyles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.2 : 0.08,
            shadowRadius: 16,
            elevation: 3,
          },
          animatedStyle,
        ]}
      >
        <Image
          source={{
            uri:
              article["Image URL"] ||
              "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=1200&q=80",
          }}
          style={[
            featuredStyles.image,
            { backgroundColor: theme.surfaceElevated },
          ]}
          contentFit="cover"
          contentPosition="right"
        />

        <LinearGradient
          colors={
            isDark
              ? ["rgba(10,12,18,0.75)", "rgba(10,12,18,0.35)", "rgba(10,12,18,0)"]
              : ["rgba(244,247,251,0.97)", "rgba(244,247,251,0.70)", "rgba(244,247,251,0)"]
          }
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={
            isDark
              ? ["rgba(10,12,18,0.3)", "rgba(10,12,18,0.1)", "rgba(10,12,18,0.3)"]
              : ["rgba(244,247,251,0.5)", "rgba(244,247,251,0.15)", "rgba(244,247,251,0.4)"]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={featuredStyles.content}>
          <Text style={[featuredStyles.category, { color: categoryColor }]}>
            {category}
          </Text>
          <Text
            style={[featuredStyles.title, { color: theme.text.primary }]}
            numberOfLines={3}
          >
            {article.Title}
          </Text>
          <Text
            style={[featuredStyles.meta, { color: theme.text.tertiary }]}
          >
            {readTime} min read
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const featuredStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    minHeight: 160,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: {
    position: "absolute",
    right: -2,
    top: 0,
    bottom: 0,
    width: "62%",
    opacity: 0.92,
  },
  content: {
    width: "58%",
    paddingHorizontal: S.lg,
    paddingVertical: S.lg,
    justifyContent: "center",
    gap: S.xxs,
    zIndex: 2,
  },
  category: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 1.5,
    lineHeight: 13,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  meta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
    marginTop: 2,
  },
});

const LatestCard = memo(function LatestCard({
  article,
  onPress,
  index,
}: {
  article: Article;
  onPress: () => void;
  index: number;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const category = (article.Category || "General").toUpperCase();
  const categoryColor = getCategoryColor(article.Category, isDark);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardBg = isDark
    ? "rgba(255,255,255,0.025)"
    : "rgba(0,0,0,0.015)";
  const cardBorder = isDark
    ? "rgba(255,255,255,0.05)"
    : "rgba(0,0,0,0.04)";

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.985, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
    >
      <Animated.View
        entering={FadeIn.duration(250).delay(index * 60)}
        style={[
          latestStyles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
          },
          animatedStyle,
        ]}
      >
        <View style={latestStyles.textSection}>
          <Text
            style={[latestStyles.category, { color: categoryColor }]}
            numberOfLines={1}
          >
            {category}
          </Text>
          <Text
            style={[latestStyles.title, { color: theme.text.primary }]}
            numberOfLines={2}
          >
            {article.Title}
          </Text>
        </View>
        <Image
          source={{
            uri:
              article["Image URL"] ||
              "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
          }}
          style={[
            latestStyles.thumbnail,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.03)",
            },
          ]}
          contentFit="cover"
        />
      </Animated.View>
    </Pressable>
  );
});

const latestStyles = StyleSheet.create({
  card: {
    borderRadius: S.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    paddingLeft: S.md,
    paddingRight: S.sm,
    paddingVertical: S.sm,
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textSection: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: S.xxs,
  },
  category: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.2,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium",
    letterSpacing: -0.1,
  },
  thumbnail: {
    width: 88,
    height: 72,
    borderRadius: 10,
  },
});

const SectionHeader = memo(function SectionHeader({
  title,
}: {
  title: string;
}) {
  const { theme } = useTheme();
  return (
    <Text style={[sectionStyles.title, { color: theme.text.primary }]}>
      {title}
    </Text>
  );
});

const sectionStyles = StyleSheet.create({
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    marginBottom: S.sm,
  },
});

export default function DiscoverTab() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [categories, setCategories] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      setSearchQuery("");
    }, [])
  );

  useEffect(() => {
    loadRecentSearches();
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performLocalSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("Articles")
        .select("Category")
        .order("id", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const uniqueCategories = Array.from(
          new Set(
            data
              .map((item) => item.Category)
              .filter((cat): cat is string => !!cat && cat.trim().length > 0)
          )
        )
          .sort()
          .slice(0, 10) as string[];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories(["Technology", "Business", "AI", "Startups"]);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading recent searches:", error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const updated = [
        query,
        ...recentSearches.filter((q) => q !== query),
      ].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  const performLocalSearch = async (query: string) => {
    setLoading(true);
    try {
      let dbQuery = supabase
        .from("Articles")
        .select(
          'id, Title, Summary, Content, "Image URL", "Article Link", Category, "Company Name"'
        )
        .order("id", { ascending: false })
        .limit(20);

      const trimmedQuery = query.trim();

      if (trimmedQuery) {
        dbQuery = dbQuery.or(
          `Title.ilike.%${trimmedQuery}%,Summary.ilike.%${trimmedQuery}%,Content.ilike.%${trimmedQuery}%`
        );
      }

      if (selectedCategory !== "All") {
        dbQuery = dbQuery.ilike("Category", selectedCategory);
      }

      const { data, error } = await dbQuery;
      if (error) throw error;

      setResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = useCallback(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      saveRecentSearch(trimmedQuery);
      router.push({
        pathname: "/search/[query]",
        params: { query: trimmedQuery },
      });
    }
  }, [searchQuery, router]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      router.push({
        pathname: "/article/[id]",
        params: {
          id: article.id.toString(),
          title: article.Title,
          summary: article.Summary || article.Content || "",
          content: article.Content || article.Summary || "",
          imageUrl: article["Image URL"] || "",
          articleLink: article["Article Link"] || "",
          category: article.Category || "",
          companyName: article["Company Name"] || "",
        },
      });
    },
    [router]
  );

  const featuredArticle = results[0];
  const latestArticles = results.slice(1, 4);

  const renderLatestArticle = useCallback(
    ({ item, index }: { item: Article; index: number }) => (
      <LatestCard
        article={item}
        onPress={() => handleArticlePress(item)}
        index={index}
      />
    ),
    [handleArticlePress]
  );

  const listHeader = (
    <View style={styles.listHeader}>
      <SectionHeader title="Featured" />
      {featuredArticle && (
        <FeaturedCard
          article={featuredArticle}
          onPress={() => handleArticlePress(featuredArticle)}
        />
      )}

      <View style={styles.latestHeaderWrap}>
        <SectionHeader title="Latest" />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SearchBar
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        onSubmit={handleSearchSubmit}
        onClear={() => setSearchQuery("")}
      />

      {searchQuery.length === 0 && recentSearches.length > 0 && (
        <View style={styles.recentWrap}>
          <View style={styles.recentHead}>
            <Text
              style={[
                styles.recentLabel,
                { color: theme.text.muted },
              ]}
            >
              RECENT
            </Text>
            <Pressable
              onPress={async () => {
                setRecentSearches([]);
                await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
              }}
              hitSlop={8}
            >
              <Text
                style={[styles.clearText, { color: theme.text.tertiary }]}
              >
                Clear
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
          >
            {recentSearches.map((q) => (
              <Pressable
                key={q}
                style={[
                  styles.recentChip,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.025)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
                onPress={() => setSearchQuery(q)}
              >
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={theme.text.muted}
                />
                <Text
                  style={[styles.recentChipText, { color: theme.text.secondary }]}
                >
                  {q}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.filtersWrap}>
        <FlatList
          horizontal
          data={["All", ...categories]}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: S.lg }}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <CategoryPillItem
              label={item}
              isActive={selectedCategory === item}
              onPress={() => setSelectedCategory(item)}
              isDark={isDark}
              theme={theme}
            />
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={latestArticles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLatestArticle}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: S.xs }} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text
                style={[styles.emptyText, { color: theme.text.tertiary }]}
              >
                No articles found.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 108 : 88,
  },

  recentWrap: {
    marginBottom: S.sm,
  },
  recentHead: {
    paddingHorizontal: S.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S.xs,
  },
  recentLabel: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  clearText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },
  recentList: {
    paddingHorizontal: S.lg,
    gap: S.xs,
  },
  recentChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: S.xs,
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  recentChipText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  filtersWrap: {
    marginBottom: S.sm,
  },

  listContent: {
    paddingHorizontal: S.lg,
    paddingBottom: 80,
  },
  listHeader: {
    marginBottom: S.xxs,
  },
  latestHeaderWrap: {
    marginTop: S.xl,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },
});
