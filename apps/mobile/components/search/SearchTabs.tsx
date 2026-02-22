import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useCallback, useRef, useState } from "react";
import {
  LayoutChangeEvent,
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export type SearchTab = "top" | "accounts" | "articles" | "communities";

interface SearchTabsProps {
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  counts?: {
    top: number;
    accounts: number;
    articles: number;
    communities: number;
  };
}

const TABS: { key: SearchTab; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "accounts", label: "Accounts" },
  { key: "articles", label: "Articles" },
  { key: "communities", label: "Communities" },
];

const SPRING_CONFIG = { damping: 20, stiffness: 220, mass: 0.8 };

export const SearchTabs = memo(function SearchTabs({
  activeTab,
  onTabChange,
  counts,
}: SearchTabsProps) {
  const { theme, isDark } = useTheme();

  // Store each tab's x-offset and width for the animated underline
  const tabLayouts = useRef<{ x: number; width: number }[]>(
    TABS.map(() => ({ x: 0, width: 0 }))
  );
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(40);

  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      tabLayouts.current[index] = { x, width };

      // If this is the active tab, update indicator immediately
      if (TABS[index].key === activeTab) {
        const pad = Math.max(8, width * 0.2);
        indicatorX.value = withSpring(x + pad / 2, SPRING_CONFIG);
        indicatorW.value = withSpring(width - pad, SPRING_CONFIG);
      }
    },
    [activeTab]
  );

  const handlePress = useCallback(
    (tab: SearchTab, index: number) => {
      onTabChange(tab);
      const layout = tabLayouts.current[index];
      if (layout && layout.width > 0) {
        const pad = Math.max(8, layout.width * 0.2);
        indicatorX.value = withSpring(layout.x + pad / 2, SPRING_CONFIG);
        indicatorW.value = withSpring(layout.width - pad, SPRING_CONFIG);
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
        tabStyles.wrapper,
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
        contentContainerStyle={tabStyles.scrollContent}
        bounces={false}
      >
        <View style={tabStyles.row}>
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            const count = counts?.[tab.key];

            return (
              <Pressable
                key={tab.key}
                onLayout={(e) => handleTabLayout(index, e)}
                onPress={() => handlePress(tab.key, index)}
                style={tabStyles.tab}
              >
                <Text
                  style={[
                    tabStyles.tabText,
                    {
                      color: isActive
                        ? theme.text.primary
                        : theme.text.tertiary,
                      fontFamily: isActive
                        ? "Poppins_600SemiBold"
                        : "Poppins_400Regular",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {count !== undefined && count > 0 && (
                  <Text
                    style={[
                      tabStyles.countBadge,
                      {
                        color: isActive
                          ? theme.text.primary
                          : theme.text.tertiary,
                      },
                    ]}
                  >
                    {count}
                  </Text>
                )}
              </Pressable>
            );
          })}

          {/* Animated underline indicator */}
          <Animated.View
            style={[
              tabStyles.indicator,
              {
                backgroundColor: theme.text.primary,
              },
              indicatorStyle,
            ]}
          />
        </View>
      </ScrollView>
    </View>
  );
});

const tabStyles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    position: "relative",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 48,
    justifyContent: "center",
    gap: 4,
  },
  tabText: {
    fontSize: 14,
    letterSpacing: -0.1,
  },
  countBadge: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    opacity: 0.6,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    borderRadius: 1.5,
  },
});

// ─── Search Header ──────────────────────────────────────────────────────────

interface SearchHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export const SearchHeader = memo(function SearchHeader({
  query,
  onQueryChange,
  onSubmit,
  onBack,
}: SearchHeaderProps) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // Unified with DiscoverTab SearchBar — no red borders
  const barBg = isDark
    ? isFocused
      ? "rgba(255,255,255,0.07)"
      : "rgba(255,255,255,0.04)"
    : isFocused
      ? "rgba(0,0,0,0.045)"
      : "rgba(0,0,0,0.025)";
  const barBorder = isDark
    ? isFocused
      ? "rgba(255,255,255,0.12)"
      : "rgba(255,255,255,0.06)"
    : isFocused
      ? "rgba(0,0,0,0.08)"
      : "rgba(0,0,0,0.05)";

  return (
    <View
      style={[
        headerStyles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Platform.OS === "ios" ? 56 : 36,
        },
      ]}
    >
      <View style={headerStyles.row}>
        <Pressable onPress={onBack} style={headerStyles.backButton} hitSlop={8}>
          <Ionicons
            name="arrow-back"
            size={22}
            color={theme.text.primary}
          />
        </Pressable>
        <View
          style={[
            headerStyles.searchBar,
            {
              backgroundColor: barBg,
              borderColor: barBorder,
            },
          ]}
        >
          <TextInput
            style={[headerStyles.input, { color: theme.text.primary }]}
            placeholder="Search..."
            placeholderTextColor={theme.text.muted}
            value={query}
            onChangeText={onQueryChange}
            returnKeyType="search"
            onSubmitEditing={onSubmit}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoFocus
            underlineColorAndroid="transparent"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => onQueryChange("")}
              hitSlop={8}
              style={headerStyles.clearButton}
            >
              <View
                style={[
                  headerStyles.clearIconBg,
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
          ) : null}
        </View>
      </View>
    </View>
  );
});

const headerStyles = StyleSheet.create({
  container: {
    zIndex: 101,
    elevation: 101,
    position: "relative",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 52,
    borderWidth: 1,
    gap: 8,
    overflow: "hidden",
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
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
});
