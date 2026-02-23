import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { StyleSheet, TouchableOpacity, View, TextInput, ScrollView, Animated } from "react-native";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

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
  { id: 1, title: "Graphic\nDesigner", icon: "color-palette", color: "#FF7A00", bgLight: "#FFF0E5" },
  { id: 2, title: "Profile\nMaker", icon: "person", color: "#007AFF", bgLight: "#E5F2FF" },
  { id: 3, title: "Reel\nEditor", icon: "videocam", color: "#FF2D55", bgLight: "#FFEAEF" },
  { id: 4, title: "Financial\nPro", icon: "briefcase", color: "#34C759", bgLight: "#EBF9EE" },
];

export default function FounderDashboardScreen() {
  const { palette, isDark } = useFlowPalette();
  const nav = useFlowNav();

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const placeholders = [
    "Find your Reels editor...",
    "Find your Graphic designer...",
    "Find your Profile maker...",
    "Find your Financial professional...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <FlowScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.8} style={[styles.avatarBtn, { borderColor: palette.border }]}>
            <Avatar source={people.alex} size={38} />
          </TouchableOpacity>
          <T weight="medium" color={palette.subText} style={styles.headerTitleSub}>
            Find Your
          </T>
          <T weight="bold" color={palette.text} style={styles.headerTitleMain}>
            Freelancer
          </T>
        </View>

        {/* Search Bar Placeholder */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: isDark ? palette.surface : "#FFFFFF" }]}>
            <Ionicons name="search" size={22} color={palette.subText} style={styles.searchIcon} />
            <Animated.View style={{ flex: 1, opacity: fadeAnim, justifyContent: "center" }}>
              <TextInput
                style={[styles.searchInput, { color: palette.text }]}
                placeholder={placeholders[placeholderIndex]}
                placeholderTextColor={palette.subText}
                editable={false}
              />
            </Animated.View>
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="options" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Most Popular Grid */}
        <View style={styles.popularSection}>
          <T weight="bold" color={palette.text} style={styles.sectionTitle}>
            Most Popular
          </T>
          <View style={styles.categoriesGrid}>
            {popularCategories.map((cat) => (
              <TouchableOpacity key={cat.id} activeOpacity={0.8} style={styles.gridItemContainer}>
                <SurfaceCard style={[styles.gridItem, { backgroundColor: isDark ? palette.surface : "#FFFFFF" }]}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : cat.bgLight }]}>
                    <Ionicons name={cat.icon as any} size={26} color={isDark ? cat.color : cat.color} />
                  </View>
                  <T weight="bold" color={palette.text} style={styles.catTitle}>
                    {cat.title}
                  </T>
                </SurfaceCard>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Existing Active Gigs Section */}
        <View style={styles.activeGigsSection}>
          <View style={styles.sectionHead}>
            <T weight="bold" color={palette.text} style={styles.sectionTitle}>
              Active Gigs
            </T>
            <TouchableOpacity onPress={() => nav.push("/freelancer-stack/my-gigs")}>
              <T weight="bold" color={palette.accent} style={styles.seeAll}>
                See all
              </T>
            </TouchableOpacity>
          </View>

          {activeGigs.map((gig) => (
            <SurfaceCard key={gig.title} style={[styles.gigCard, { backgroundColor: isDark ? palette.surface : "#FFFFFF" }]}>
              <View style={styles.gigTop}>
                <View style={{ flex: 1 }}>
                  <T weight="bold" color={palette.text} style={styles.gigTitle}>
                    {gig.title}
                  </T>
                  <T weight="medium" color={palette.subText} style={styles.gigSub}>
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
                    color={gig.statusTone === "danger" ? "#FF3B30" : "#2A63F6"}
                    style={styles.badgeText}
                  >
                    {gig.status}
                  </T>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: palette.borderLight || palette.border }]} />

              <View style={styles.gigBottom}>
                <View style={styles.avatarRow}>
                  {gig.avatars.map((a, i) => (
                    <View key={`${a}-${i}`} style={{ marginLeft: i === 0 ? 0 : -10, borderWidth: 2, borderColor: palette.surface, borderRadius: 16 }}>
                      <Avatar source={a} size={26} />
                    </View>
                  ))}
                </View>
                <T weight="semiBold" color={palette.subText} style={styles.gigMetric}>
                  {gig.metric}
                </T>
              </View>
            </SurfaceCard>
          ))}
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  avatarBtn: {
    alignSelf: "flex-end",
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 20,
    padding: 2,
  },
  headerTitleSub: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  headerTitleMain: {
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1,
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 32,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingLeft: 20,
    paddingRight: 6,
    height: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    fontSize: 16,
    fontWeight: "500",
    height: "100%",
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
  popularSection: {
    paddingHorizontal: 24,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
  },
  gridItemContainer: {
    width: "47%",
    marginBottom: 16,
  },
  gridItem: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    minHeight: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 0,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  catTitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 20,
  },
  activeGigsSection: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  seeAll: {
    fontSize: 15,
  },
  gigCard: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 0,
  },
  gigTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  gigTitle: { fontSize: 18, flexShrink: 1, letterSpacing: -0.3 },
  gigSub: { fontSize: 14, marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontSize: 10, letterSpacing: 0.8 },
  divider: { height: 1, marginVertical: 16 },
  gigBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  gigMetric: { fontSize: 14 },
});
