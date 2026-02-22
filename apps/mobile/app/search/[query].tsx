import { useTheme } from "@/context/ThemeContext";
import {
  SearchArticle,
  SearchAccount,
  SearchCommunity,
  SearchResults,
  SearchCounts,
  getSearchCounts,
  searchAll,
} from "@/lib/search";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  Platform,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { memo } from "react";
import { SearchHeader, SearchTabs, SearchTab } from "../../components/search/SearchTabs";

const { width: windowWidth } = Dimensions.get("window");
const S = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 } as const;

type FlatListItem =
  | { type: "article"; data: SearchArticle }
  | { type: "account"; data: SearchAccount }
  | { type: "community"; data: SearchCommunity };

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const ArticleCard = memo(function ArticleCard({
  article,
  onPress,
}: {
  article: SearchArticle;
  onPress: () => void;
}) {
  const { theme, isDark } = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        entering={FadeInDown.duration(300).springify()}
        style={[
          styles.card,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.018)",
            borderColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.045)",
          },
        ]}
      >
        <View style={styles.articleContent}>
          <Text
            style={[styles.articleTitle, { color: theme.text.primary }]}
            numberOfLines={2}
          >
            {article.Title}
          </Text>
          {article.Summary && (
            <Text
              style={[styles.articleSummary, { color: theme.text.secondary }]}
              numberOfLines={2}
            >
              {article.Summary}
            </Text>
          )}
          {article.Category && (
            <Text style={[styles.articleCategory, { color: theme.brand.primary }]}>
              {article.Category}
            </Text>
          )}
        </View>
        {article["Image URL"] && (
          <Image
            source={{ uri: article["Image URL"] }}
            style={styles.articleImage}
            contentFit="cover"
          />
        )}
      </Animated.View>
    </Pressable>
  );
});

const AccountCard = memo(function AccountCard({
  account,
  onPress,
}: {
  account: SearchAccount;
  onPress: () => void;
}) {
  const { theme, isDark } = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        entering={FadeInDown.duration(300).springify()}
        style={[
          styles.accountCard,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.018)",
            borderColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.045)",
          },
        ]}
      >
        <View
          style={[
            styles.avatarPlaceholder,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          {account.avatar_url ? (
            <Image
              source={{ uri: account.avatar_url }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <Ionicons
              name="person"
              size={20}
              color={theme.text.tertiary}
            />
          )}
        </View>
        <View style={styles.accountInfo}>
          <Text style={[styles.accountName, { color: theme.text.primary }]}>
            {account.display_name}
          </Text>
          <Text style={[styles.accountUsername, { color: theme.text.tertiary }]}>
            @{account.username}
          </Text>
          {account.bio && (
            <Text
              style={[styles.accountBio, { color: theme.text.secondary }]}
              numberOfLines={1}
            >
              {account.bio}
            </Text>
          )}
        </View>
        <View
          style={[
            styles.followButton,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <Text style={[styles.followText, { color: theme.text.primary }]}>
            Follow
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const CommunityCard = memo(function CommunityCard({
  community,
  onPress,
}: {
  community: SearchCommunity;
  onPress: () => void;
}) {
  const { theme, isDark } = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        entering={FadeInDown.duration(300).springify()}
        style={[
          styles.communityCard,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.018)",
            borderColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.045)",
          },
        ]}
      >
        <View
          style={[
            styles.communityAvatar,
            {
              backgroundColor: isDark
                ? "rgba(255,59,48,0.15)"
                : "rgba(255,59,48,0.1)",
            },
          ]}
        >
          <Ionicons
            name="people"
            size={18}
            color={theme.brand.primary}
          />
        </View>
        <View style={styles.communityInfo}>
          <Text style={[styles.communityName, { color: theme.text.primary }]}>
            {community.name}
          </Text>
          {community.description && (
            <Text
              style={[styles.communityDesc, { color: theme.text.secondary }]}
              numberOfLines={1}
            >
              {community.description}
            </Text>
          )}
          <Text style={[styles.communityMembers, { color: theme.text.tertiary }]}>
            {community.member_count.toLocaleString()} members
          </Text>
        </View>
        <View
          style={[
            styles.joinButton,
            {
              backgroundColor: theme.brand.primary,
            },
          ]}
        >
          <Text style={styles.joinText}>Join</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const EmptyState = memo(function EmptyState({
  query,
  isLoading,
}: {
  query: string;
  isLoading: boolean;
}) {
  const { theme, isDark } = useTheme();

  if (isLoading) return null;

  return (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconContainer,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.03)",
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={40}
          color={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)"}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
        No results found
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
        We couldn't find anything for "{query}".{"\n"}Try searching for something else.
      </Text>
    </View>
  );
});

const InitialState = memo(function InitialState() {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconContainer,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.03)",
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={40}
          color={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)"}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
        Search for anything
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
        Find articles, accounts, and communities
      </Text>
    </View>
  );
});

const LoadingState = memo(function LoadingState() {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.skeletonRow}>
        {[1, 2, 3].map((i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.duration(300).delay(i * 100)}
            style={[
              styles.skeletonCard,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <View
              style={[
                styles.skeletonLine,
                styles.skeletonTitle,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                styles.skeletonSubtitle,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
});

export default function SearchResultsScreen() {
  const { query: initialQuery } = useLocalSearchParams<{ query: string }>();
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [query, setQuery] = useState(initialQuery || "");
  const [activeTab, setActiveTab] = useState<SearchTab>("top");
  const [results, setResults] = useState<SearchResults>({
    top: [],
    articles: [],
    accounts: [],
    communities: [],
  });
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults({ top: [], articles: [], accounts: [], communities: [] });
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const searchResults = await searchAll(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => getSearchCounts(results), [results]);

  const flatData = useMemo((): FlatListItem[] => {
    switch (activeTab) {
      case "top":
        return results.top.map((item) => {
          if ("Title" in item) return { type: "article", data: item as SearchArticle };
          if ("display_name" in item) return { type: "account", data: item as SearchAccount };
          return { type: "community", data: item as SearchCommunity };
        });
      case "articles":
        return results.articles.map((item) => ({ type: "article" as const, data: item }));
      case "accounts":
        return results.accounts.map((item) => ({ type: "account" as const, data: item }));
      case "communities":
        return results.communities.map((item) => ({ type: "community" as const, data: item }));
    }
  }, [activeTab, results]);

  const handleArticlePress = useCallback((article: SearchArticle) => {
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
  }, [router]);

  const handleAccountPress = useCallback((account: SearchAccount) => {
    console.log("Navigate to profile:", account.username);
  }, []);

  const handleCommunityPress = useCallback((community: SearchCommunity) => {
    router.push({
      pathname: "/tribe/[id]",
      params: { id: community.id },
    });
  }, [router]);

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      router.setParams({ query: query.trim() });
      performSearch(query.trim());
    }
  }, [query, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: FlatListItem }) => {
      switch (item.type) {
        case "article":
          return (
            <ArticleCard
              article={item.data}
              onPress={() => handleArticlePress(item.data)}
            />
          );
        case "account":
          return (
            <AccountCard
              account={item.data}
              onPress={() => handleAccountPress(item.data)}
            />
          );
        case "community":
          return (
            <CommunityCard
              community={item.data}
              onPress={() => handleCommunityPress(item.data)}
            />
          );
      }
    },
    [handleArticlePress, handleAccountPress, handleCommunityPress]
  );

  const keyExtractor = useCallback((item: FlatListItem) => {
    switch (item.type) {
      case "article":
        return `article-${item.data.id}`;
      case "account":
        return `account-${item.data.id}`;
      case "community":
        return `community-${item.data.id}`;
    }
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <SearchHeader
        query={query}
        onQueryChange={setQuery}
        onSubmit={handleSubmit}
        onBack={handleBack}
      />

      <SearchTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {loading ? (
        <LoadingState />
      ) : flatData.length > 0 ? (
        <FlatList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: S.sm }} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      ) : query.length > 0 ? (
        <EmptyState query={query} isLoading={loading} />
      ) : (
        <InitialState />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    padding: S.md,
  },
  skeletonRow: {
    gap: S.sm,
  },
  skeletonCard: {
    borderRadius: 12,
    padding: S.md,
    borderWidth: 1,
  },
  skeletonLine: {
    borderRadius: 4,
  },
  skeletonTitle: {
    height: 16,
    width: "70%",
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 12,
    width: "50%",
  },
  listContent: {
    padding: S.md,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: S.xxl,
    paddingBottom: 120,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: S.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
    marginBottom: S.xs,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.5,
  },
  card: {
    flexDirection: "row",
    borderRadius: 14,
    padding: S.md,
    borderWidth: 1,
    gap: S.sm,
  },
  articleContent: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  articleTitle: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  articleSummary: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
    opacity: 0.8,
  },
  articleCategory: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  articleImage: {
    width: 80,
    height: 70,
    borderRadius: 10,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: S.md,
    borderWidth: 1,
    gap: S.sm,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 50,
    height: 50,
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  accountName: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
  accountUsername: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },
  accountBio: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    borderRadius: 20,
  },
  followText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  communityCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: S.md,
    borderWidth: 1,
    gap: S.sm,
  },
  communityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  communityInfo: {
    flex: 1,
    gap: 2,
  },
  communityName: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
  communityDesc: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },
  communityMembers: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },
  joinButton: {
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    borderRadius: 20,
  },
  joinText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
});
