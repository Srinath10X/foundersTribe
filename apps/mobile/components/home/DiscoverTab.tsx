import { Typography } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const RECENT_SEARCHES_KEY = "@recent_searches";
const MAX_RECENT_SEARCHES = 3;
const { width } = Dimensions.get("window");

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

export default function DiscoverTab() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadRecentSearches();
    fetchCategories();
    performSearch("");
  }, []);

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
              .filter(
                (cat): cat is string => !!cat && cat.trim().length > 0
              )
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

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

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
      await AsyncStorage.setItem(
        RECENT_SEARCHES_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  const performSearch = async (query: string) => {
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

      if (selectedCategory) {
        dbQuery = dbQuery.ilike("Category", `%${selectedCategory}%`);
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

  const renderArticle = ({ item }: { item: Article }) => {
    const minutes = Math.ceil(
      (item.Content || item.Summary || "").split(/\s+/).length / 200
    );

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleArticlePress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          {item.Category && (
            <Text
              style={[styles.cardCategory, { color: theme.brand.primary }]}
            >
              {item.Category.toUpperCase()}
            </Text>
          )}
          <Text
            style={[styles.cardTitle, { color: theme.text.primary }]}
            numberOfLines={3}
          >
            {item.Title}
          </Text>

          <View style={styles.cardMeta}>
            <View
              style={[
                styles.dot,
                { backgroundColor: theme.text.tertiary },
              ]}
            />
            <Text
              style={[styles.cardTime, { color: theme.text.tertiary }]}
            >
              {minutes} MIN READ
            </Text>
          </View>
        </View>

        <Image
          source={{
            uri:
              item["Image URL"] ||
              "https://images.unsplash.com/photo-1541560052-5e137f229371",
          }}
          style={[
            styles.cardImage,
            { backgroundColor: theme.surfaceElevated },
          ]}
          contentFit="cover"
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity onPress={() => performSearch(searchQuery)}>
            <Ionicons
              name="search"
              size={20}
              color={theme.text.tertiary}
              style={{ marginRight: 8 }}
            />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: theme.text.primary }]}
            placeholder="Search global insights..."
            placeholderTextColor={theme.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => performSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.text.tertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={categories}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.pill,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
                selectedCategory === item && {
                  backgroundColor: theme.brand.primary,
                  borderColor: theme.brand.primary,
                },
              ]}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === item ? null : item
                )
              }
            >
              <Text
                style={[
                  styles.pillText,
                  { color: theme.text.secondary },
                  selectedCategory === item && {
                    color: theme.text.inverse,
                    fontWeight: "600",
                  },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text.muted }]}>
          {searchQuery ? "SEARCH RESULTS" : "TRENDING NOW"}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.text.tertiary },
                ]}
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
    paddingTop: Platform.OS === "ios" ? 100 : 80,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  filtersContainer: {
    marginBottom: 30,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 160,
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
  card: {
    flexDirection: "row",
    marginBottom: 24,
    backgroundColor: "transparent",
    gap: 16,
    alignItems: "flex-start",
  },
  cardContent: {
    flex: 1,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 10,
    fontFamily: Typography.fonts.primary,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
  },
  cardTime: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardImage: {
    width: 100,
    height: 75,
    borderRadius: 12,
  },
});
