import { Colors, Spacing, Type } from "@/constants/DesignSystem";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  useCategories,
  useUserInterests,
  useSaveInterests,
} from "@/hooks/useOnboarding";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function EditInterests() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);

  const {
    data: categories = [],
    isLoading: loadingCategories,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategories();

  const {
    data: existingInterests,
    isLoading: loadingInterests,
  } = useUserInterests(user?.id);

  const saveInterestsMutation = useSaveInterests();

  const loading = loadingCategories || loadingInterests;

  // Preload existing interests when fetched
  useEffect(() => {
    if (existingInterests && existingInterests.length > 0 && selected.length === 0) {
      setSelected(existingInterests);
    }
  }, [existingInterests]);

  const toggleInterest = (id: string) => {
    const normalizedId = id.toLowerCase().replace(/ /g, "_");

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

  const handleSave = async () => {
    if (!user || selected.length < 3) return;

    try {
      const interestsData = selected.map((catId) => {
        const cat = categories.find((c) => c.id === catId);
        return { category: cat ? cat.label : catId };
      });

      await saveInterestsMutation.mutateAsync(interestsData);
      router.back();
    } catch (error: any) {
      if (error?.code === "PGRST301" || error?.status === 403) {
        Alert.alert("Permission Denied", "Please check your connection and try again.");
      } else {
        Alert.alert("Error", error?.message || "Failed to save interests");
      }
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Edit Interests
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, { color: theme.text.primary }]}>
            Personalize your feed
          </Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            Select at least{" "}
            <Text style={{ color: theme.text.primary, fontWeight: "700" }}>
              3 categories
            </Text>{" "}
            to customize your news experience.
          </Text>
          <Text style={[styles.currentCount, { color: theme.text.secondary }]}>
            Currently selected:{" "}
            <Text style={{ color: theme.brand.primary, fontWeight: "700" }}>
              {selected.length}
            </Text>
          </Text>
        </View>

        {/* Categories Grid */}
        {categoriesError ? (
          <View style={styles.centeredMessage}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.text.muted} />
            <Text style={[styles.centeredText, { color: theme.text.secondary, marginTop: 12 }]}>
              Could not load categories
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: theme.brand.primary }]}
              onPress={() => refetchCategories()}
            >
              <Ionicons name="refresh-outline" size={18} color={theme.brand.primary} />
              <Text style={[styles.retryText, { color: theme.brand.primary }]}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.centeredMessage}>
            <Ionicons name="albums-outline" size={48} color={theme.text.muted} />
            <Text style={[styles.centeredText, { color: theme.text.secondary, marginTop: 12 }]}>
              No categories found
            </Text>
            <Text style={[styles.centeredSubtext, { color: theme.text.muted }]}>
              Please check back later or contact support.
            </Text>
          </View>
        ) : (
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
        )}
      </ScrollView>

      {/* Footer Action */}
      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, borderTopColor: theme.surface },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: theme.brand.primary },
            selected.length < 3 && {
              backgroundColor: theme.border,
              opacity: 0.5,
            },
          ]}
          onPress={handleSave}
          disabled={selected.length < 3 || saveInterestsMutation.isPending}
        >
          {saveInterestsMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.saveText}>Save Changes</Text>
              <Ionicons name="checkmark" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.countText, { color: theme.text.tertiary }]}>
          {selected.length} of 3+ selected
        </Text>
      </View>
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
    marginBottom: Spacing.md,
  },
  currentCount: {
    fontSize: 14,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  card: {
    width: "48%",
    aspectRatio: 1.4,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 12,
  },
  cardActive: {
    borderColor: Colors.brand.primary,
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
    backgroundColor: "rgba(37, 99, 235, 0.2)",
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    borderTopWidth: 1,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  saveBtnDisabled: {
    backgroundColor: Colors.borderLight,
    opacity: 0.5,
  },
  saveText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  countText: {
    fontSize: 12,
    textAlign: "center",
  },
  centeredMessage: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  centeredText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  centeredSubtext: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
