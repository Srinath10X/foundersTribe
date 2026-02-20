import { Typography } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const RECENT_SEARCHES_KEY = "@recent_searches";
const MAX_RECENT_SEARCHES = 3;

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

export default function DiscoverTab() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadRecentSearches();
    fetchCategories();
    performSearch("");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 350);

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
          .slice(0, 10);
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
      const updated = [query, ...recentSearches.filter((q) => q !== query)].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  const performSearch = async (query: string) => {
    setLoading(true);
    try {
      let dbQuery = supabase
        .from("Articles")
        .select('id, Title, Summary, Content, "Image URL", "Article Link", Category, "Company Name"')
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

      if (trimmedQuery) {
        saveRecentSearch(trimmedQuery);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleArticlePress = (article: Article) => {
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
  };

  const featuredArticle = results[0];
  const latestArticles = results.slice(1, 4);

  const renderFeatured = () => {
    if (!featuredArticle) return null;
    const featuredCategory = (featuredArticle.Category || "Payments").toUpperCase();
    const featuredReadTime = getReadTimeMinutes(featuredArticle);
    const featuredCategoryColor = getCategoryColor(featuredArticle.Category, isDark);
    return (
      <TouchableOpacity
        style={[
          styles.featuredCard,
          {
            backgroundColor: isDark ? theme.surface : "#EEF4FF",
            borderColor: isDark ? theme.border : "#E3EBF8",
          },
        ]}
        onPress={() => handleArticlePress(featuredArticle)}
        activeOpacity={0.88}
      >
        <Image
          source={{
            uri:
              featuredArticle["Image URL"] ||
              "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=1200&q=80",
          }}
          style={[styles.featuredArt, { backgroundColor: theme.surfaceElevated }]}
          contentFit="cover"
          contentPosition="right"
        />
        <LinearGradient
          colors={
            isDark
              ? ["rgba(18,14,12,0.34)", "rgba(20,18,20,0.22)", "rgba(20,18,20,0.04)"]
              : [
                  "rgba(216,192,162,0.34)",
                  "rgba(198,220,246,0.28)",
                  "rgba(228,240,255,0.14)",
                ]
          }
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={styles.featuredFade}
        />
        <LinearGradient
          colors={
            isDark
              ? ["rgba(16,18,23,0.20)", "rgba(16,18,23,0.06)", "rgba(16,18,23,0.22)"]
              : ["rgba(228,240,255,0.42)", "rgba(241,248,255,0.10)", "rgba(216,234,252,0.48)"]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.featuredFade}
        />
        <LinearGradient
          colors={
            isDark
              ? ["rgba(10,12,18,0.58)", "rgba(10,12,18,0.30)", "rgba(10,12,18,0)"]
              : ["rgba(246,250,255,0.96)", "rgba(242,248,255,0.78)", "rgba(242,248,255,0.04)"]
          }
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.featuredFade}
        />
        <LinearGradient
          colors={
            isDark
              ? ["rgba(10,12,18,0.20)", "rgba(10,12,18,0.08)", "rgba(10,12,18,0)"]
              : ["rgba(238,246,255,0.60)", "rgba(238,246,255,0.22)", "rgba(238,246,255,0.00)"]
          }
          start={{ x: 0.54, y: 0.5 }}
          end={{ x: 0.74, y: 0.5 }}
          style={styles.featuredFade}
        />
        <LinearGradient
          colors={
            isDark
              ? ["rgba(20,22,30,0.95)", "rgba(20,22,30,0.55)", "rgba(20,22,30,0.00)"]
              : ["rgba(238,244,255,0.98)", "rgba(238,244,255,0.66)", "rgba(238,244,255,0.00)"]
          }
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.featuredSeamMask}
        />
        <View style={styles.featuredContent}>
          <Text style={[styles.featuredBadgeText, { color: featuredCategoryColor }]}>{featuredCategory}</Text>
          <Text style={[styles.featuredTitle, { color: theme.text.primary }]}>
            {featuredArticle.Title}
          </Text>
          <Text style={[styles.featuredMeta, { color: theme.text.secondary }]}>{featuredReadTime} min read</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLatestArticle = ({ item }: { item: Article }) => {
    const categoryText = (item.Category || "General").toUpperCase();
    const categoryColor = getCategoryColor(item.Category, isDark);
    return (
      <TouchableOpacity
        style={[
          styles.latestCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
        onPress={() => handleArticlePress(item)}
        activeOpacity={0.88}
      >
        <View style={styles.latestText}>
          <Text style={[styles.latestCategory, { color: categoryColor }]} numberOfLines={1}>
            {categoryText}
          </Text>
          <Text style={[styles.latestTitle, { color: theme.text.primary }]}>
            {item.Title}
          </Text>
        </View>
        <Image
          source={{
            uri:
              item["Image URL"] ||
              "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
          }}
          style={[styles.latestImage, { backgroundColor: theme.surfaceElevated }]}
          contentFit="cover"
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <TouchableOpacity onPress={() => performSearch(searchQuery)}>
            <Ionicons name="search" size={18} color={theme.text.tertiary} style={{ marginRight: 8 }} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: theme.text.primary }]}
            placeholder="Search Globally"
            placeholderTextColor={theme.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => performSearch(searchQuery)}
          />
          <View style={[styles.aiTag, { backgroundColor: isDark ? "rgba(255,59,48,0.16)" : "rgba(255,59,48,0.12)" }]}> 
            <Ionicons name="sparkles-outline" size={12} color={theme.brand.primary} />
            <Text style={[styles.aiTagText, { color: theme.brand.primary }]}>AI</Text>
          </View>
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.length === 0 && recentSearches.length > 0 && (
        <View style={styles.recentWrap}>
          <View style={styles.recentHead}>
            <Text style={[styles.recentTitle, { color: theme.text.muted }]}>RECENT SEARCHES</Text>
            <TouchableOpacity
              onPress={async () => {
                setRecentSearches([]);
                await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
              }}
            >
              <Text style={[styles.clearText, { color: theme.brand.primary }]}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
            {recentSearches.map((query) => (
              <TouchableOpacity
                key={query}
                style={[styles.recentChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => setSearchQuery(query)}
              >
                <Ionicons name="time-outline" size={13} color={theme.text.tertiary} />
                <Text style={[styles.recentChipText, { color: theme.text.secondary }]}>{query}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={["All", ...categories]}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.pill,
                { backgroundColor: theme.surface, borderColor: theme.border },
                selectedCategory === item && {
                  backgroundColor: theme.brand.primary,
                  borderColor: theme.brand.primary,
                },
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: theme.text.secondary },
                  selectedCategory === item && { color: theme.text.inverse, fontWeight: "600" },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
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
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.cardsHeaderWrap}>
              <Text style={[styles.blockTitle, { color: theme.text.primary }]}>Featured</Text>
              {renderFeatured()}
              <Text style={[styles.blockTitle, { color: theme.text.primary, marginTop: 14, marginBottom: 10 }]}>
                Latest
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>No articles found.</Text>
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
    paddingTop: Platform.OS === "ios" ? 104 : 84,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fonts.primary,
  },
  aiTag: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 8,
  },
  aiTagText: {
    ...Typography.presets.caption,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
    fontSize: 10,
  },
  recentWrap: {
    marginBottom: 8,
  },
  recentHead: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  recentTitle: {
    ...Typography.presets.label,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
  },
  clearText: {
    ...Typography.presets.caption,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
  },
  recentList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  recentChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recentChipText: {
    ...Typography.presets.bodySmall,
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "500",
    fontFamily: "Poppins_500Medium",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 72,
  },
  cardsHeaderWrap: {
    marginBottom: 2,
  },
  blockTitle: {
    ...Typography.presets.h3,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.02,
    marginBottom: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
  },
  featuredCard: {
    borderRadius: 14,
    minHeight: 142,
    borderWidth: 0,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  featuredFade: { ...StyleSheet.absoluteFillObject },
  featuredContent: {
    width: "66%",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    justifyContent: "center",
    gap: 3,
    zIndex: 2,
  },
  featuredArt: {
    position: "absolute",
    right: -3,
    top: 0,
    bottom: 0,
    width: "66%",
    opacity: 0.9,
  },
  featuredSeamMask: {
    position: "absolute",
    left: "34%",
    top: 0,
    bottom: 0,
    width: 36,
  },
  featuredBadgeText: {
    fontWeight: "500",
    letterSpacing: 1.8,
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    lineHeight: 13,
  },
  featuredTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.02,
  },
  featuredMeta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  latestCard: {
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 106,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  latestText: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingVertical: 0,
  },
  latestCategory: {
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 1,
    fontFamily: "Poppins_500Medium",
    marginBottom: 2,
  },
  latestTitle: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Poppins_500Medium",
    letterSpacing: 0.02,
    marginBottom: 0,
  },
  latestImage: {
    width: 102,
    height: 76,
    borderRadius: 8,
  },
});
