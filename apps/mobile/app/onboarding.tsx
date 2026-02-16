/**
 * ONBOARDING - PERSONALIZE FEED
 * Ultra-Premium "Intelligence Terminal" Style.
 * Matches screenshot reference.
 */

import { Spacing, Type } from "@/constants/DesignSystem";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

const API_URL =
  process.env.EXPO_PUBLIC_VOICE_API_URL || "http://localhost:3002";

export default function Onboarding() {
  const router = useRouter();
  const { user, session, refreshOnboardingStatus } = useAuth();
  const { theme, isDark } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<
    { id: string; label: string; image: string }[]
  >([]);

  const authToken = session?.access_token;

  useEffect(() => {
    if (authToken) fetchCategories();
  }, [authToken]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/get_all_categories`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);

      const data: { category_name: string; image_url: string }[] =
        await res.json();
      console.log("Fetched categories data:", data);

      const fetchedCats = data.map((item) => ({
        id: item.category_name.toLowerCase().replace(/ /g, "_"),
        label: item.category_name,
        image:
          item.image_url ||
          "https://images.unsplash.com/photo-1557683311-eac922347aa1",
      }));

      setCategories(fetchedCats);
    } catch (e) {
      console.error("Error fetching categories:", e);
    }
  };

  const toggleInterest = (id: string) => {
    const normalizedId = id.toLowerCase().replace(/ /g, "_");
    console.log("Toggling:", normalizedId, "Current selected:", selected);

    if (selected.includes(normalizedId)) {
      setSelected((prev) => prev.filter((i) => i !== normalizedId));
    } else {
      setSelected((prev) => [...prev, normalizedId]);
    }
  };

  const isSelected = (id: string) => {
    const normalizedId = id.toLowerCase().replace(/ /g, "_");
    return selected.includes(normalizedId);
  };

  const handleFinish = async () => {
    if (!user) return;
    if (selected.length < 3) return;

    setLoading(true);

    try {
      console.log("Saving interests for user:", user.id);

      const res = await fetch(`${API_URL}/api/user_categories`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          categories: selected,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Server error: ${res.status}`);
      }

      console.log("Save result: OK");

      await refreshOnboardingStatus();
      console.log("✅ Onboarding completed, redirecting to home...");
      setTimeout(() => {
        router.replace("/(tabs)/home");
      }, 500);
    } catch (e: any) {
      console.error("Error saving interests:", e);
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Personalize Your Feed
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressText, { color: theme.text.tertiary }]}>
            ONBOARDING PROGRESS
          </Text>
          <Text style={[styles.stepText, { color: theme.brand.primary }]}>
            Step 0 of 1
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.bar,
              { width: "10%", backgroundColor: theme.brand.primary },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(800)}
          style={styles.titleSection}
        >
          <Text style={[styles.mainTitle, { color: theme.text.primary }]}>
            What interests you?
          </Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            Select a minimum of{" "}
            <Text style={{ color: theme.text.primary, fontWeight: "700" }}>
              3 categories
            </Text>{" "}
            to curate your premium experience.
          </Text>
        </Animated.View>

        {/* Dynamic Categories Grid */}
        {categories.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(300).duration(800)}
            style={styles.moreSection}
          >
            <Text
              style={[styles.sectionHeader, { color: theme.text.tertiary }]}
            >
              ALL CATEGORIES
            </Text>
            <View style={styles.gridContainer}>
              {categories.map((item) => {
                const active = isSelected(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.card,
                      { backgroundColor: theme.surface },
                      active && { borderColor: theme.brand.primary },
                    ]}
                    onPress={() => toggleInterest(item.id)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: item.image }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.9)"]}
                      style={styles.cardGradient}
                    />

                    <View style={styles.cardContent}>
                      <Text style={styles.cardLabel}>{item.label}</Text>
                    </View>

                    {active && (
                      <View style={styles.checkIcon}>
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="white"
                        />
                      </View>
                    )}
                    {active && <View style={styles.activeOverlay} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Footer Action */}
      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, borderTopColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.continueBtn,
            { backgroundColor: theme.brand.primary },
            selected.length < 3 && {
              backgroundColor: theme.border,
              opacity: 0.5,
            },
          ]}
          onPress={handleFinish}
          disabled={selected.length < 3 || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.continueText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.countText, { color: theme.text.tertiary }]}>
          {selected.length} of 3 selected
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Spacing.md,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    ...Type.body,
    fontWeight: "700",
    fontSize: 16,
  },
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    ...Type.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  stepText: {
    ...Type.label,
    fontSize: 10,
    fontWeight: "700",
  },
  track: {
    height: 4,
    borderRadius: 2,
  },
  bar: {
    height: "100%",
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 140,
  },
  titleSection: {
    marginBottom: Spacing.xl,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  card: {
    width: "48%", // Approx half
    aspectRatio: 1.4,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 12, // Gap replacement
  },
  cardImage: {
    width: "100%",
    height: "100%",
    opacity: 0.6,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(37, 99, 235, 0.2)", // Blue tint
  },
  cardContent: {
    position: "absolute",
    bottom: Spacing.md,
    left: Spacing.md,
  },
  cardLabel: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  checkIcon: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  moreSection: {
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    ...Type.label,
    fontSize: 11,
    marginBottom: Spacing.md,
    letterSpacing: 1,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    borderTopWidth: 1,
  },
  continueBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  continueText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  countText: {
    fontSize: 12,
    textAlign: "center",
  },
});
