import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ScrollView,
  Animated,
  Platform,
} from "react-native";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

// Data Models
const activeGigs = [
  {
    title: "Senior React Developer",
    sub: "Neobank App",
    status: "HIRING",
    statusTone: "danger" as const,
    metric: "12 Applications",
    avatars: [people.female1, people.female2, people.sarah],
  },
  {
    title: "UI/UX Design Audit",
    sub: "Dashboard Redesign",
    status: "IN PROGRESS",
    statusTone: "progress" as const,
    metric: "Due in 3 days",
    avatars: [people.alex],
  },
];

const popularCategories = [
  {
    id: 1,
    title: "Graphic Designer",
    icon: "color-palette",
    color: "#FF7A00",
    bgLight: "rgba(255, 122, 0, 0.12)",
  },
  {
    id: 2,
    title: "Profile Maker",
    icon: "person",
    color: "#007AFF",
    bgLight: "rgba(0, 122, 255, 0.12)",
  },
  {
    id: 3,
    title: "Reel Editor",
    icon: "videocam",
    color: "#FF2D55",
    bgLight: "rgba(255, 45, 85, 0.12)",
  },
  {
    id: 4,
    title: "Financial Pro",
    icon: "briefcase",
    color: "#34C759",
    bgLight: "rgba(52, 199, 89, 0.12)",
  },
];

export default function FounderDashboardScreen() {
  const { palette, isDark } = useFlowPalette();
  const nav = useFlowNav();

  // Search Animation State
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isFocused = useRef(new Animated.Value(0)).current;

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [searchText, setSearchText] = useState("");

  const placeholders = [
    "Find your Reels editor...",
    "Find your Graphic designer...",
    "Find your Marketing manager...",
    "Find your Financial manager...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchFocus = () => {
    setIsInputFocused(true);
    Animated.spring(isFocused, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    setIsInputFocused(false);
    Animated.spring(isFocused, {
      toValue: 0,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  };

  const dynamicShadowOpacity = isFocused.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.12],
  });

  return (
    <FlowScreen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* --- Header Section --- */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.avatarBtn,
              { borderColor: palette.borderLight || palette.border },
            ]}
          >
            <Avatar source={people.alex} size={40} />
          </TouchableOpacity>

          <T
            weight="medium"
            color={palette.subText}
            style={styles.headerTitleSub}
          >
            Find Your
          </T>
          <T weight="bold" color={palette.text} style={styles.headerTitleMain}>
            Freelancer
          </T>
        </View>

        {/* --- Search Section --- */}
        <View style={styles.searchSection}>
          <Animated.View
            style={[
              styles.searchBox,
              {
                backgroundColor: isDark ? palette.surface : "#FFFFFF",
                borderColor: isDark ? palette.borderLight : "rgba(0,0,0,0.05)",
                borderWidth: isDark ? 1 : 1,
                shadowColor: "#000",
                shadowOpacity: dynamicShadowOpacity,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 4,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={22}
              color={palette.subText}
              style={styles.searchIcon}
            />
            <View style={{ flex: 1, justifyContent: "center" }}>
              {!isInputFocused && searchText.length === 0 && (
                <Animated.View
                  style={{
                    flex: 1,
                    opacity: fadeAnim,
                    position: "absolute",
                    width: "100%",
                  }}
                  pointerEvents="none"
                >
                  <T
                    weight="medium"
                    color={palette.subText}
                    style={styles.placeholderText}
                  >
                    {placeholders[placeholderIndex]}
                  </T>
                </Animated.View>
              )}
              <TextInput
                style={[styles.searchInput, { color: palette.text }]}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onChangeText={setSearchText}
                value={searchText}
                placeholderTextColor="transparent"
              />
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.filterBtn}>
              <Ionicons name="options" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* --- Most Popular Section --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <T weight="bold" color={palette.text} style={styles.sectionTitle}>
              Most Popular
            </T>
          </View>
          <View style={styles.categoriesGrid}>
            {popularCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.75}
                style={styles.gridItemWrapper}
              >
                <SurfaceCard
                  style={[
                    styles.gridItem,
                    {
                      backgroundColor: isDark ? palette.surface : "#FFFFFF",
                      borderColor: palette.borderLight || "transparent",
                    },
                  ]}
                >
                  <View
                    style={[styles.iconBox, { backgroundColor: cat.bgLight }]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={28}
                      color={cat.color}
                    />
                  </View>
                  <T
                    weight="semiBold"
                    color={palette.text}
                    style={styles.catTitle}
                  >
                    {cat.title}
                  </T>
                </SurfaceCard>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* --- Active Gigs Section --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <T weight="bold" color={palette.text} style={styles.sectionTitle}>
              Active Gigs
            </T>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => nav.push("/freelancer-stack/my-gigs")}
            >
              <T weight="bold" color={palette.accent} style={styles.seeAllText}>
                See All
              </T>
            </TouchableOpacity>
          </View>

          {activeGigs.map((gig, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.8}
              style={styles.gigCardWrapper}
            >
              <SurfaceCard
                style={[
                  styles.gigCard,
                  {
                    backgroundColor: isDark ? palette.surface : "#FFFFFF",
                    borderColor: palette.borderLight || "transparent",
                  },
                ]}
              >
                <View style={styles.gigTop}>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <T
                      weight="bold"
                      color={palette.text}
                      style={styles.gigTitle}
                    >
                      {gig.title}
                    </T>
                    <T
                      weight="medium"
                      color={palette.subText}
                      style={styles.gigSub}
                    >
                      {gig.sub}
                    </T>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          gig.statusTone === "danger"
                            ? "rgba(255, 59, 48, 0.12)"
                            : "rgba(42, 99, 246, 0.12)",
                      },
                    ]}
                  >
                    <T
                      weight="bold"
                      color={
                        gig.statusTone === "danger" ? "#FF3B30" : "#2A63F6"
                      }
                      style={styles.badgeText}
                    >
                      {gig.status}
                    </T>
                  </View>
                </View>

                {/* Styled Divider */}
                <View
                  style={[
                    styles.divider,
                    {
                      backgroundColor:
                        palette.borderLight || "rgba(0,0,0,0.05)",
                    },
                  ]}
                />

                <View style={styles.gigBottom}>
                  <View style={styles.avatarStack}>
                    {gig.avatars.map((avatar, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.avatarRing,
                          {
                            marginLeft: idx === 0 ? 0 : -12,
                            borderColor: isDark ? palette.surface : "#FFFFFF",
                          },
                        ]}
                      >
                        <Avatar source={avatar} size={28} />
                      </View>
                    ))}
                  </View>
                  <T
                    weight="semiBold"
                    color={palette.subText}
                    style={styles.gigMetricText}
                  >
                    {gig.metric}
                  </T>
                </View>
              </SurfaceCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 64, // Space for floating tab bar if added later
  },
  /* --- Typography & Spacing System (8pt based) --- */
  header: {
    paddingTop: 64, // 8 * 8
    paddingHorizontal: 24, // 8 * 3
    paddingBottom: 24,
  },
  avatarBtn: {
    alignSelf: "flex-end",
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 22,
    padding: 2,
  },
  headerTitleSub: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.4,
    opacity: 0.8,
  },
  headerTitleMain: {
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1.2,
    marginTop: 4,
  },

  /* --- Search Bar Upgrade --- */
  searchSection: {
    paddingHorizontal: 24,
    marginBottom: 32, // 8 * 4
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20, // Better pill shape ratio
    paddingLeft: 20,
    paddingRight: 8,
    height: 64,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    fontWeight: "500",
    height: "100%",
  },
  placeholderText: {
    fontSize: 16,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 16, // Squircle geometry
    backgroundColor: "#1C1C1E", // Premium dark contrast
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* --- Section Headers --- */
  sectionContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    letterSpacing: -0.6,
  },
  seeAllText: {
    fontSize: 15,
  },

  /* --- Most Popular Grid --- */
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16, // 8 * 2
  },
  gridItemWrapper: {
    width: "47%",
  },
  gridItem: {
    padding: 24,
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderRadius: 24,
    minHeight: 160,
    // Soft standard shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1, // Will be overridden if light mode
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 20, // Squircle
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  catTitle: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.3,
  },

  /* --- Active Gigs Section --- */
  gigCardWrapper: {
    marginBottom: 16,
  },
  gigCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  gigTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  gigTitle: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  gigSub: {
    fontSize: 14,
    marginTop: 6, // 8pt related spacing
    opacity: 0.7,
  },
  badge: {
    borderRadius: 12, // Improved badge pill
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    marginVertical: 20,
    borderRadius: 1,
  },
  gigBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: 20,
  },
  gigMetricText: {
    fontSize: 14,
  },
});
