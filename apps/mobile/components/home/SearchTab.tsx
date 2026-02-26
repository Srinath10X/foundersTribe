import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import {
  searchAll,
  SearchArticle,
  SearchAccount,
  SearchCommunity,
  SearchResults,
} from "@/lib/search";
import { Ionicons } from "@expo/vector-icons";
import { PeopleList } from "@/components/PeopleList";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ─── Constants ───────────────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = "@search_tab_recent";
const MAX_RECENT_SEARCHES = 8;

const S = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

const SEARCH_PLACEHOLDERS = [
  "Search people, articles, communities...",
  "Find a graphic designer...",
  "Discover startup articles...",
  "Search for communities...",
  "Find a content writer...",
  "Explore tech founders...",
];

type ResultTab = "all" | "people" | "articles" | "communities";

const RESULT_TABS: { key: ResultTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "people", label: "People" },
  { key: "articles", label: "Articles" },
  { key: "communities", label: "Communities" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type FlatListItem =
  | { type: "article"; data: SearchArticle }
  | { type: "account"; data: SearchAccount }
  | { type: "community"; data: SearchCommunity }
  | { type: "section-header"; title: string; count: number };

// ─── Search Bar (redesigned) ─────────────────────────────────────────────────

const UniversalSearchBar = memo(function UniversalSearchBar({
  query,
  onChangeQuery,
  onSubmit,
  onClear,
  onFocusChange,
  autoFocus,
}: {
  query: string;
  onChangeQuery: (q: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onFocusChange?: (focused: boolean) => void;
  autoFocus?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Rotating placeholder animation
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const placeholderOpacity = useSharedValue(1);

  useEffect(() => {
    if (query.length > 0) return;

    const interval = setInterval(() => {
      placeholderOpacity.value = withTiming(0, { duration: 300 });
      setTimeout(() => {
        setPlaceholderIdx((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
        placeholderOpacity.value = withTiming(1, { duration: 300 });
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [query.length]);

  const placeholderAnimStyle = useAnimatedStyle(() => ({
    opacity: placeholderOpacity.value,
  }));

  const barBg = isDark
    ? isFocused ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)"
    : isFocused ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.03)";
  const barBorder = isDark
    ? isFocused ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"
    : isFocused ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.06)";

  return (
    <View style={searchBarStyles.container}>
      <View
        style={[
          searchBarStyles.inputContainer,
          {
            backgroundColor: barBg,
            borderColor: barBorder,
          },
        ]}
      >
        <Ionicons
          name="search"
          size={20}
          color={isFocused ? theme.brand.primary : theme.text.tertiary}
        />
        <View style={searchBarStyles.inputWrap}>
          <TextInput
            ref={inputRef}
            style={[searchBarStyles.input, { color: theme.text.primary }]}
            placeholder=""
            value={query}
            onChangeText={onChangeQuery}
            returnKeyType="search"
            onSubmitEditing={onSubmit}
            onFocus={() => {
              setIsFocused(true);
              onFocusChange?.(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              onFocusChange?.(false);
            }}
            autoFocus={autoFocus}
            underlineColorAndroid="transparent"
          />
          {query.length === 0 && (
            <Animated.View
              style={[searchBarStyles.placeholderOverlay, placeholderAnimStyle]}
              pointerEvents="none"
            >
              <Text style={[searchBarStyles.placeholderText, { color: theme.text.muted }]}>
                {SEARCH_PLACEHOLDERS[placeholderIdx]}
              </Text>
            </Animated.View>
          )}
        </View>
        {query.length > 0 ? (
          <Pressable onPress={onClear} hitSlop={8} style={searchBarStyles.clearBtn}>
            <View
              style={[
                searchBarStyles.clearBg,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.08)",
                },
              ]}
            >
              <Ionicons name="close" size={12} color={theme.text.tertiary} />
            </View>
          </Pressable>
        ) : (
          <View
            style={[
              searchBarStyles.aiBadge,
              {
                backgroundColor: isDark
                  ? "rgba(255,59,48,0.12)"
                  : "rgba(255,59,48,0.08)",
              },
            ]}
          >
            <Ionicons name="sparkles" size={11} color={theme.brand.primary} />
            <Text style={[searchBarStyles.aiText, { color: theme.brand.primary }]}>
              AI
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

const searchBarStyles = StyleSheet.create({
  container: {
    paddingHorizontal: S.lg,
    marginBottom: S.sm,
    zIndex: 101,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: S.md,
    height: 52,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
    letterSpacing: -0.1,
  },
  inputWrap: {
    flex: 1,
    justifyContent: "center",
  },
  placeholderOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  placeholderText: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    letterSpacing: -0.1,
  },
  clearBtn: { padding: 4 },
  clearBg: {
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
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  aiText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.5,
  },
});

// ─── Result Tab Bar ──────────────────────────────────────────────────────────

const ResultTabBar = memo(function ResultTabBar({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: ResultTab;
  onTabChange: (tab: ResultTab) => void;
  counts: { all: number; people: number; articles: number; communities: number };
}) {
  const { theme, isDark } = useTheme();
  const tabLayouts = useRef<{ x: number; width: number }[]>(
    RESULT_TABS.map(() => ({ x: 0, width: 0 }))
  );
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(40);

  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      tabLayouts.current[index] = { x, width };
      if (RESULT_TABS[index].key === activeTab) {
        const pad = Math.max(6, width * 0.15);
        indicatorX.value = withSpring(x + pad / 2, { damping: 20, stiffness: 220 });
        indicatorW.value = withSpring(width - pad, { damping: 20, stiffness: 220 });
      }
    },
    [activeTab]
  );

  const handlePress = useCallback(
    (tab: ResultTab, index: number) => {
      onTabChange(tab);
      const layout = tabLayouts.current[index];
      if (layout && layout.width > 0) {
        const pad = Math.max(6, layout.width * 0.15);
        indicatorX.value = withSpring(layout.x + pad / 2, { damping: 20, stiffness: 220 });
        indicatorW.value = withSpring(layout.width - pad, { damping: 20, stiffness: 220 });
      }
    },
    [onTabChange]
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  return (
    <View
      style={[
        tabBarStyles.wrapper,
        {
          borderBottomColor: isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tabBarStyles.scrollContent}
        bounces={false}
      >
        <View style={tabBarStyles.row}>
          {RESULT_TABS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            const count = counts[tab.key];
            return (
              <Pressable
                key={tab.key}
                onLayout={(e) => handleTabLayout(index, e)}
                onPress={() => handlePress(tab.key, index)}
                style={tabBarStyles.tab}
              >
                <Text
                  style={[
                    tabBarStyles.tabText,
                    {
                      color: isActive ? theme.text.primary : theme.text.tertiary,
                      fontFamily: isActive ? "Poppins_600SemiBold" : "Poppins_400Regular",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <Text
                    style={[
                      tabBarStyles.countBadge,
                      {
                        color: isActive ? theme.brand.primary : theme.text.muted,
                        backgroundColor: isActive
                          ? isDark ? "rgba(255,59,48,0.12)" : "rgba(255,59,48,0.08)"
                          : "transparent",
                      },
                    ]}
                  >
                    {count}
                  </Text>
                )}
              </Pressable>
            );
          })}
          <Animated.View
            style={[
              tabBarStyles.indicator,
              { backgroundColor: theme.brand.primary },
              indicatorStyle,
            ]}
          />
        </View>
      </ScrollView>
    </View>
  );
});

const tabBarStyles = StyleSheet.create({
  wrapper: { borderBottomWidth: StyleSheet.hairlineWidth },
  scrollContent: { paddingHorizontal: S.md },
  row: { flexDirection: "row", alignItems: "center", height: 48, position: "relative" },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.sm,
    height: 48,
    justifyContent: "center",
    gap: 5,
  },
  tabText: { fontSize: 14, letterSpacing: -0.1 },
  countBadge: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  indicator: { position: "absolute", bottom: 0, height: 2.5, borderRadius: 2 },
});

// ─── Result Cards ────────────────────────────────────────────────────────────

const PersonCard = memo(function PersonCard({
  account,
  onPress,
  index,
}: {
  account: SearchAccount;
  onPress: () => void;
  index: number;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(250).delay(index * 50)}
        style={[
          personStyles.card,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          },
          animStyle,
        ]}
      >
        <View
          style={[
            personStyles.avatar,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          {account.avatar_url ? (
            <Image
              source={{ uri: account.avatar_url }}
              style={personStyles.avatarImg}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="person" size={20} color={theme.text.tertiary} />
          )}
        </View>
        <View style={personStyles.info}>
          <Text style={[personStyles.name, { color: theme.text.primary }]} numberOfLines={1}>
            {account.display_name}
          </Text>
          <Text style={[personStyles.username, { color: theme.text.tertiary }]} numberOfLines={1}>
            @{account.username}
          </Text>
          {account.skills && account.skills.length > 0 && (
            <View style={personStyles.skillsRow}>
              {account.skills.slice(0, 3).map((skill) => (
                <View
                  key={skill}
                  style={[
                    personStyles.skillChip,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <Text style={[personStyles.skillText, { color: theme.text.secondary }]}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View
          style={[
            personStyles.viewBtn,
            { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
          ]}
        >
          <Ionicons name="arrow-forward" size={14} color={theme.text.secondary} />
        </View>
      </Animated.View>
    </Pressable>
  );
});

const personStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: S.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: S.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 48, height: 48 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontFamily: "Poppins_600SemiBold", letterSpacing: -0.1 },
  username: { fontSize: 12, fontFamily: "Poppins_400Regular" },
  skillsRow: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  skillChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  skillText: { fontSize: 10, fontFamily: "Poppins_500Medium" },
  viewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});

const ArticleResultCard = memo(function ArticleResultCard({
  article,
  onPress,
  index,
}: {
  article: SearchArticle;
  onPress: () => void;
  index: number;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(250).delay(index * 50)}
        style={[
          articleStyles.card,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          },
          animStyle,
        ]}
      >
        <View style={articleStyles.textSection}>
          {article.Category && (
            <Text style={[articleStyles.category, { color: theme.brand.primary }]}>
              {article.Category.toUpperCase()}
            </Text>
          )}
          <Text style={[articleStyles.title, { color: theme.text.primary }]} numberOfLines={2}>
            {article.Title}
          </Text>
          {article.Summary && (
            <Text style={[articleStyles.summary, { color: theme.text.secondary }]} numberOfLines={1}>
              {article.Summary}
            </Text>
          )}
        </View>
        {article["Image URL"] ? (
          <Image
            source={{ uri: article["Image URL"] }}
            style={[
              articleStyles.thumbnail,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              },
            ]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              articleStyles.thumbnail,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons name="document-text-outline" size={20} color={theme.text.muted} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

const articleStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 14,
    padding: S.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: S.sm,
    alignItems: "center",
  },
  textSection: { flex: 1, gap: 3 },
  category: {
    fontSize: 9,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  summary: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    lineHeight: 16,
  },
  thumbnail: { width: 72, height: 60, borderRadius: 12 },
});

const CommunityResultCard = memo(function CommunityResultCard({
  community,
  onPress,
  index,
}: {
  community: SearchCommunity;
  onPress: () => void;
  index: number;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(250).delay(index * 50)}
        style={[
          communityStyles.card,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          },
          animStyle,
        ]}
      >
        <View
          style={[
            communityStyles.iconWrap,
            {
              backgroundColor: isDark ? "rgba(255,59,48,0.12)" : "rgba(255,59,48,0.08)",
            },
          ]}
        >
          {community.avatar_url ? (
            <Image
              source={{ uri: community.avatar_url }}
              style={communityStyles.iconImg}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="people" size={18} color={theme.brand.primary} />
          )}
        </View>
        <View style={communityStyles.info}>
          <Text style={[communityStyles.name, { color: theme.text.primary }]} numberOfLines={1}>
            {community.name}
          </Text>
          {community.description && (
            <Text
              style={[communityStyles.desc, { color: theme.text.secondary }]}
              numberOfLines={1}
            >
              {community.description}
            </Text>
          )}
          <Text style={[communityStyles.members, { color: theme.text.tertiary }]}>
            {community.member_count.toLocaleString()} members
          </Text>
        </View>
        <View
          style={[
            communityStyles.viewBtn,
            { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
          ]}
        >
          <Ionicons name="arrow-forward" size={14} color={theme.text.secondary} />
        </View>
      </Animated.View>
    </Pressable>
  );
});

const communityStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: S.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: S.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  iconImg: { width: 44, height: 44 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontFamily: "Poppins_600SemiBold" },
  desc: { fontSize: 12, fontFamily: "Poppins_400Regular" },
  members: { fontSize: 11, fontFamily: "Poppins_400Regular" },
  viewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});

// ─── Section header in results ───────────────────────────────────────────────

const ResultSectionHeader = memo(function ResultSectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  const { theme } = useTheme();
  return (
    <View style={sectionHeaderStyles.container}>
      <Text style={[sectionHeaderStyles.title, { color: theme.text.primary }]}>{title}</Text>
      <Text style={[sectionHeaderStyles.count, { color: theme.text.muted }]}>{count}</Text>
    </View>
  );
});

const sectionHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: S.md,
    paddingBottom: S.xs,
  },
  title: { fontSize: 13, fontFamily: "Poppins_600SemiBold", letterSpacing: -0.1 },
  count: { fontSize: 11, fontFamily: "Poppins_400Regular" },
});

// ─── Idle State (no query) ───────────────────────────────────────────────────

const IdleArticleCard = memo(function IdleArticleCard({
  article,
  onPress,
  index,
}: {
  article: SearchArticle;
  onPress: () => void;
  index: number;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(300).delay(index * 80)}
        style={[
          idleCardStyles.card,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.95)",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          },
          animStyle,
        ]}
      >
        {article["Image URL"] ? (
          <Image
            source={{ uri: article["Image URL"] }}
            style={[
              idleCardStyles.image,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              },
            ]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              idleCardStyles.image,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Text style={{ color: theme.text.muted, fontSize: 12, fontFamily: "Poppins_400Regular" }}>
              No image
            </Text>
          </View>
        )}
        <View style={idleCardStyles.body}>
          {article.Category && (
            <Text style={[idleCardStyles.category, { color: theme.brand.primary }]}>
              {article.Category.toUpperCase()}
            </Text>
          )}
          <Text style={[idleCardStyles.title, { color: theme.text.primary }]} numberOfLines={2}>
            {article.Title}
          </Text>
          {article.Summary && (
            <Text style={[idleCardStyles.summary, { color: theme.text.secondary }]} numberOfLines={2}>
              {article.Summary}
            </Text>
          )}
          {article["Company Name"] && (
            <Text style={[idleCardStyles.company, { color: theme.text.muted }]} numberOfLines={1}>
              {article["Company Name"]}
            </Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});

const idleCardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 160,
  },
  body: {
    padding: S.md,
    gap: 4,
  },
  category: {
    fontSize: 9,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  summary: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    lineHeight: 17,
  },
  company: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    marginTop: 2,
  },
});

const IdleContent = memo(function IdleContent({
  recentSearches,
  onSelectRecent,
  onClearRecents,
  idleArticles,
  idleLoading,
  onArticlePress,
}: {
  recentSearches: string[];
  onSelectRecent: (q: string) => void;
  onClearRecents: () => void;
  idleArticles: SearchArticle[];
  idleLoading: boolean;
  onArticlePress: (article: SearchArticle) => void;
}) {
  const { theme, isDark } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={idleStyles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Minimal header */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={idleStyles.headerWrap}>
        <Text style={[idleStyles.headerTitle, { color: theme.text.primary }]}>
          Explore
        </Text>
        <Text style={[idleStyles.headerSubtitle, { color: theme.text.tertiary }]}>
          Discover articles, people, and communities
        </Text>
      </Animated.View>

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <View style={idleStyles.recentHead}>
            <Text style={[idleStyles.sectionLabel, { color: theme.text.muted }]}>
              RECENT
            </Text>
            <Pressable onPress={onClearRecents} hitSlop={8}>
              <Text style={[idleStyles.clearText, { color: theme.text.tertiary }]}>Clear</Text>
            </Pressable>
          </View>
          <View style={idleStyles.recentList}>
            {recentSearches.map((q) => (
              <Pressable
                key={q}
                style={[
                  idleStyles.recentChip,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)",
                    borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  },
                ]}
                onPress={() => onSelectRecent(q)}
              >
                <Text style={[idleStyles.recentText, { color: theme.text.secondary }]}>{q}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

      {/* People section */}
      <Animated.View entering={FadeInDown.duration(400).delay(250)}>
        <Text style={[idleStyles.sectionLabel, { color: theme.text.muted, marginTop: S.lg }]}>
          PEOPLE
        </Text>
        <PeopleList />
      </Animated.View>

      {/* Articles section */}
      <Animated.View entering={FadeInDown.duration(400).delay(350)}>
        <Text style={[idleStyles.sectionLabel, { color: theme.text.muted, marginTop: S.lg }]}>
          SUGGESTED ARTICLES
        </Text>
        {idleLoading ? (
          <View style={idleStyles.loadingWrap}>
            <ActivityIndicator color={theme.brand.primary} />
          </View>
        ) : idleArticles.length > 0 ? (
          <View style={idleStyles.articlesList}>
            {idleArticles.map((article, index) => (
              <IdleArticleCard
                key={article.id}
                article={article}
                onPress={() => onArticlePress(article)}
                index={index}
              />
            ))}
          </View>
        ) : (
          <Text style={[idleStyles.emptyText, { color: theme.text.muted }]}>
            No articles available
          </Text>
        )}
      </Animated.View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
});

const idleStyles = StyleSheet.create({
  container: { paddingHorizontal: S.lg, paddingTop: S.xs },
  headerWrap: { paddingVertical: S.md, gap: 2 },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: S.sm,
  },
  recentHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: S.md,
    marginBottom: S.sm,
  },
  clearText: { fontSize: 11, fontFamily: "Poppins_500Medium" },
  recentList: { flexDirection: "row", flexWrap: "wrap", gap: S.xs },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recentText: { fontSize: 12, fontFamily: "Poppins_400Regular" },
  articlesList: { gap: S.md },
  loadingWrap: { paddingVertical: S.xxl, alignItems: "center" },
  emptyText: { fontSize: 13, fontFamily: "Poppins_400Regular", paddingVertical: S.md },
});

// ─── List Separator ───────────────────────────────────────────────────────────

const ListSeparator = () => <View style={{ height: S.xs }} />;

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SearchTab() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTab>("all");

  // Idle state: articles fetched on mount
  const [idleArticles, setIdleArticles] = useState<SearchArticle[]>([]);
  const [idleLoading, setIdleLoading] = useState(true);

  const [results, setResults] = useState<SearchResults>({
    top: [],
    articles: [],
    accounts: [],
    communities: [],
  });

  const isSearching = searchQuery.trim().length > 0;

  // Load recent on mount + fetch idle articles
  useEffect(() => {
    loadRecentSearches();
    fetchIdleArticles();
  }, []);

  const fetchIdleArticles = async () => {
    setIdleLoading(true);
    try {
      const { data, error } = await supabase
        .from("Articles")
        .select(
          'id, Title, Summary, Content, "Image URL", "Article Link", Category, "Company Name"'
        )
        .order("id", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Idle articles fetch error:", error);
      } else {
        setIdleArticles(data || []);
      }
    } catch (err) {
      console.error("Idle articles fetch error:", err);
    } finally {
      setIdleLoading(false);
    }
  };


  // Debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults({ top: [], articles: [], accounts: [], communities: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchAll(trimmed);
        setResults(res);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  };

  const saveRecentSearch = async (query: string) => {
    const updated = [query, ...recentSearches.filter((q) => q !== query)].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const clearRecents = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
  };

  const handleSearchSubmit = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      saveRecentSearch(trimmed);
    }
  }, [searchQuery]);

  // ─── Result counts ──────────────────────────────────────────────

  const counts = useMemo(
    () => ({
      all: results.accounts.length + results.articles.length + results.communities.length,
      people: results.accounts.length,
      articles: results.articles.length,
      communities: results.communities.length,
    }),
    [results]
  );

  // ─── Build flat list data based on active tab ──────────────────

  const flatData = useMemo((): FlatListItem[] => {
    switch (activeTab) {
      case "all": {
        const items: FlatListItem[] = [];
        if (results.accounts.length > 0) {
          items.push({ type: "section-header", title: "People", count: results.accounts.length });
          results.accounts
            .slice(0, 3)
            .forEach((a) => items.push({ type: "account", data: a }));
        }
        if (results.articles.length > 0) {
          items.push({ type: "section-header", title: "Articles", count: results.articles.length });
          results.articles
            .slice(0, 3)
            .forEach((a) => items.push({ type: "article", data: a }));
        }
        if (results.communities.length > 0) {
          items.push({
            type: "section-header",
            title: "Communities",
            count: results.communities.length,
          });
          results.communities
            .slice(0, 3)
            .forEach((c) => items.push({ type: "community", data: c }));
        }
        return items;
      }
      case "people":
        return results.accounts.map((a) => ({ type: "account" as const, data: a }));
      case "articles":
        return results.articles.map((a) => ({ type: "article" as const, data: a }));
      case "communities":
        return results.communities.map((c) => ({ type: "community" as const, data: c }));
    }
  }, [activeTab, results]);

  // ─── Navigation handlers ───────────────────────────────────────

  const handleArticlePress = useCallback(
    (article: SearchArticle) => {
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

  const handleAccountPress = useCallback(
    (account: SearchAccount) => {
      router.push({
        pathname: "/freelancer-stack/public-profile" as any,
        params: { id: account.id },
      });
    },
    [router]
  );


  const handleCommunityPress = useCallback(
    (community: SearchCommunity) => {
      router.push({
        pathname: "/tribe/[id]" as any,
        params: { id: community.id },
      });
    },
    [router]
  );

  // ─── Render items ──────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: FlatListItem; index: number }) => {
      switch (item.type) {
        case "section-header":
          return <ResultSectionHeader title={item.title} count={item.count} />;
        case "account":
          return (
            <PersonCard
              account={item.data}
              onPress={() => handleAccountPress(item.data)}
              index={index}
            />
          );
        case "article":
          return (
            <ArticleResultCard
              article={item.data}
              onPress={() => handleArticlePress(item.data)}
              index={index}
            />
          );
        case "community":
          return (
            <CommunityResultCard
              community={item.data}
              onPress={() => handleCommunityPress(item.data)}
              index={index}
            />
          );
      }
    },
    [handleArticlePress, handleAccountPress, handleCommunityPress]
  );

  const keyExtractor = useCallback((item: FlatListItem, index: number) => {
    switch (item.type) {
      case "section-header":
        return `header-${item.title}`;
      case "account":
        return `person-${item.data.id}`;
      case "article":
        return `article-${item.data.id}`;
      case "community":
        return `community-${item.data.id}`;
    }
  }, []);

  // ─── Render ────────────────────────────────────────────────────

  const totalResults = counts.people + counts.articles + counts.communities;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <UniversalSearchBar
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        onSubmit={handleSearchSubmit}
        onClear={() => setSearchQuery("")}
      />

      {isSearching ? (
        <>
          <ResultTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.brand.primary} />
              <Text style={[styles.loadingText, { color: theme.text.tertiary }]}>
                Searching...
              </Text>
            </View>
          ) : totalResults > 0 ? (
            <FlatList
              data={flatData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.resultsList}
              ItemSeparatorComponent={ListSeparator}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />
          ) : (
            <View style={styles.emptyWrap}>
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={36}
                  color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                No results found
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
                Try searching with different keywords
              </Text>
            </View>
          )}
        </>
      ) : (
        <IdleContent
          recentSearches={recentSearches}
          onSelectRecent={(q) => setSearchQuery(q)}
          onClearRecents={clearRecents}
          idleArticles={idleArticles}
          idleLoading={idleLoading}
          onArticlePress={handleArticlePress}
        />
      )}
    </View>
  );
}

// ─── Main Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 108 : 88,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: S.sm,
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },
  resultsList: {
    paddingHorizontal: S.lg,
    paddingTop: S.xs,
    paddingBottom: 100,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 120,
    gap: S.xs,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: S.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});
