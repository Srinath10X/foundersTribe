import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import { useFreelancerServices } from "@/hooks/useGig";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const popularCategories = [
  { id: 1, title: "Graphic Designer", icon: "color-palette" as const, color: "#FF7A00", bg: "rgba(255,122,0,0.12)" },
  { id: 2, title: "Profile Maker", icon: "person" as const, color: "#007AFF", bg: "rgba(0,122,255,0.12)" },
  { id: 3, title: "Reel Editor", icon: "videocam" as const, color: "#FF2D55", bg: "rgba(255,45,85,0.12)" },
  { id: 4, title: "Financial Pro", icon: "briefcase" as const, color: "#34C759", bg: "rgba(52,199,89,0.12)" },
];

type ServiceSort = "relevance" | "cost_asc" | "cost_desc" | "time_asc" | "time_desc";
type CostBand = "any" | "budget" | "mid" | "premium";
type TribeProfileLite = {
  id: string;
  display_name: string;
  username: string;
  role: string | null;
  avatar_url: string | null;
  bio: string | null;
};

const serviceSortOptions: { key: ServiceSort; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "cost_asc", label: "Cost ↑" },
  { key: "cost_desc", label: "Cost ↓" },
  { key: "time_asc", label: "Fastest" },
  { key: "time_desc", label: "Longest" },
];

const costBands: { key: CostBand; label: string; min?: number; max?: number }[] = [
  { key: "any", label: "Any cost" },
  { key: "budget", label: "Budget", max: 5000 },
  { key: "mid", label: "Mid", min: 5000, max: 15000 },
  { key: "premium", label: "Premium", min: 15000 },
];
const STORAGE_BUCKET = "tribe-media";

function formatServiceDuration(days: number) {
  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}

function isValidImageUri(value?: string | null) {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

function firstLetter(name: string) {
  const safe = String(name || "").trim();
  return safe ? safe.charAt(0).toUpperCase() : "F";
}

async function resolveAvatar(candidate: unknown, userId: string): Promise<string | null> {
  if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (typeof candidate === "string" && candidate.trim()) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
    if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
  }

  if (!userId) return null;
  const folder = `profiles/${userId}`;
  const { data: files } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 20 });
  if (!Array.isArray(files) || files.length === 0) return null;
  const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
  if (!preferred?.name) return null;

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
  return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
}

export default function ServiceSearchScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ q?: string }>();

  const initialQuery = typeof params.q === "string" ? params.q : "";

  const [searchText, setSearchText] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialQuery || null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<ServiceSort>("relevance");
  const [maxDeliveryDays, setMaxDeliveryDays] = useState<number | null>(null);
  const [costBand, setCostBand] = useState<CostBand>("any");
  const [publicProfilesById, setPublicProfilesById] = useState<Record<string, TribeProfileLite>>({});

  const searchKeyword = searchText.trim();
  const effectiveServiceQuery = searchKeyword || selectedCategory || "";
  const activeCostBand = costBands.find((band) => band.key === costBand) || costBands[0];

  const serviceFilters = useMemo(
    () =>
      effectiveServiceQuery
        ? {
            q: effectiveServiceQuery,
            sort_by: sortBy,
            limit: 40,
            min_cost: activeCostBand.min,
            max_cost: activeCostBand.max,
            max_delivery_days: maxDeliveryDays || undefined,
          }
        : undefined,
    [activeCostBand.max, activeCostBand.min, effectiveServiceQuery, maxDeliveryDays, sortBy],
  );

  const {
    data: freelancerServiceData,
    isLoading,
    isFetching,
    refetch,
  } = useFreelancerServices(serviceFilters, Boolean(serviceFilters));

  const freelancerServiceResults = useMemo(
    () => freelancerServiceData?.items ?? [],
    [freelancerServiceData?.items],
  );

  useEffect(() => {
    const token = session?.access_token;
    if (!token || freelancerServiceResults.length === 0) return;

    const missingIds = freelancerServiceResults
      .map((item) => item.freelancer_id)
      .filter((id) => id && !publicProfilesById[id]);

    if (!missingIds.length) return;
    let cancelled = false;

    (async () => {
      const rows = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const raw = await tribeApi.getPublicProfile(token, id);
            const avatarUrl =
              (await resolveAvatar(raw?.photo_url || raw?.avatar_url || null, id)) ||
              (typeof raw?.photo_url === "string" && raw.photo_url.trim()
                ? raw.photo_url
                : typeof raw?.avatar_url === "string" && raw.avatar_url.trim()
                  ? raw.avatar_url
                  : null);
            return [
              id,
              {
                id,
                display_name:
                  String(raw?.display_name || raw?.full_name || raw?.username || "").trim() || "Freelancer",
                username: String(raw?.username || raw?.handle || "member"),
                role: typeof raw?.role === "string" ? raw.role : typeof raw?.user_type === "string" ? raw.user_type : null,
                avatar_url: avatarUrl,
                bio: typeof raw?.bio === "string" ? raw.bio : null,
              } as TribeProfileLite,
            ] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );

      if (cancelled) return;
      setPublicProfilesById((prev) => {
        const next = { ...prev };
        rows.forEach(([id, row]) => {
          if (!row) return;
          next[id] = row;
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [freelancerServiceResults, publicProfilesById, session?.access_token]);

  const openSearch = (seed?: string) => {
    const value = (seed ?? searchText).trim();
    if (!value) return;
    setSearchText(value);
    setSelectedCategory(value);
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity
          onPress={nav.back}
          style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
        >
          <Ionicons name="arrow-back" size={15} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Service Search</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Find freelancers by offered services</T>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          <View style={[styles.searchBox, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}> 
            <Ionicons name="search" size={15} color={palette.subText} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search services"
              placeholderTextColor={palette.subText}
              style={[styles.searchInput, { color: palette.text }]}
              returnKeyType="search"
              onSubmitEditing={() => openSearch()}
            />
            <TouchableOpacity onPress={() => setShowFilters((prev) => !prev)}>
              <Ionicons name="options-outline" size={17} color={palette.subText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openSearch()}>
              <Ionicons name="arrow-forward-circle" size={20} color={palette.accent} />
            </TouchableOpacity>
          </View>

          {showFilters ? (
            <SurfaceCard style={styles.filtersCard}>
              <View style={styles.filterRowWrap}>
                {serviceSortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    activeOpacity={0.84}
                    onPress={() => setSortBy(option.key)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: sortBy === option.key ? palette.accent : palette.borderLight,
                        backgroundColor: sortBy === option.key ? palette.accentSoft : palette.surface,
                      },
                    ]}
                  >
                    <T weight="medium" color={sortBy === option.key ? palette.accent : palette.subText} style={styles.filterChipText}>
                      {option.label}
                    </T>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.filterRowWrap}>
                {[null, 7, 14, 30].map((days) => {
                  const active = maxDeliveryDays === days;
                  return (
                    <TouchableOpacity
                      key={days === null ? "any" : String(days)}
                      activeOpacity={0.84}
                      onPress={() => setMaxDeliveryDays(days)}
                      style={[
                        styles.filterChip,
                        {
                          borderColor: active ? palette.accent : palette.borderLight,
                          backgroundColor: active ? palette.accentSoft : palette.surface,
                        },
                      ]}
                    >
                      <T weight="medium" color={active ? palette.accent : palette.subText} style={styles.filterChipText}>
                        {days === null ? "Any time" : `≤ ${days}d`}
                      </T>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.filterRowWrap}>
                {costBands.map((band) => {
                  const active = costBand === band.key;
                  return (
                    <TouchableOpacity
                      key={band.key}
                      activeOpacity={0.84}
                      onPress={() => setCostBand(band.key)}
                      style={[
                        styles.filterChip,
                        {
                          borderColor: active ? palette.accent : palette.borderLight,
                          backgroundColor: active ? palette.accentSoft : palette.surface,
                        },
                      ]}
                    >
                      <T weight="medium" color={active ? palette.accent : palette.subText} style={styles.filterChipText}>
                        {band.label}
                      </T>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </SurfaceCard>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>Popular Categories</T>
            </View>
            <View style={styles.categoriesGrid}>
              {popularCategories.map((cat) => {
                const active = selectedCategory === cat.title;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.86}
                    onPress={() => openSearch(cat.title)}
                    style={[
                      styles.categoryCell,
                      {
                        borderColor: active ? palette.accent : palette.borderLight,
                        backgroundColor: active ? palette.accentSoft : palette.surface,
                      },
                    ]}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}> 
                      <Ionicons name={cat.icon} size={14} color={cat.color} />
                    </View>
                    <T weight="medium" color={palette.text} style={styles.categoryTitle} numberOfLines={1}>
                      {cat.title}
                    </T>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>Results</T>
              <T weight="regular" color={palette.subText} style={styles.sectionMeta}>{freelancerServiceResults.length} found</T>
            </View>

            {!effectiveServiceQuery ? (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="search" size={20} color={palette.subText} />
                <T weight="medium" color={palette.text} style={styles.emptyTitle}>Start searching</T>
                <T weight="regular" color={palette.subText} style={styles.emptySub}>Type a service and press search.</T>
              </SurfaceCard>
            ) : isLoading || isFetching ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator size="small" color={palette.accent} />
              </View>
            ) : freelancerServiceResults.length === 0 ? (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="search" size={22} color={palette.subText} />
                <T weight="medium" color={palette.text} style={styles.emptyTitle}>No service matches</T>
                <T weight="regular" color={palette.subText} style={styles.emptySub}>Try another keyword or relax filters.</T>
              </SurfaceCard>
            ) : (
              <View style={styles.stack}>
                {freelancerServiceResults.map((item) => {
                  const profile = publicProfilesById[item.freelancer_id];
                  const primary = item.services[0];
                  const displayName = profile?.display_name || "Freelancer";
                  const avatarUri = isValidImageUri(profile?.avatar_url) ? profile?.avatar_url : null;
                  return (
                    <TouchableOpacity
                      key={item.freelancer_id}
                      activeOpacity={0.86}
                      onPress={() =>
                        nav.push(
                          `/freelancer-stack/freelancer-profile?id=${item.freelancer_id}${
                            primary?.id ? `&serviceId=${encodeURIComponent(primary.id)}` : ""
                          }`,
                        )
                      }
                    >
                      <SurfaceCard style={styles.freelancerCard}>
                        {avatarUri ? (
                          <Avatar source={{ uri: avatarUri }} size={42} />
                        ) : (
                          <View style={[styles.avatarFallback, { backgroundColor: palette.accentSoft }]}>
                            <T weight="medium" color={palette.accent} style={styles.avatarLetter}>
                              {firstLetter(displayName)}
                            </T>
                          </View>
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <T weight="medium" color={palette.text} style={styles.freelancerName} numberOfLines={1}>
                            {displayName}
                          </T>
                          <T weight="regular" color={palette.subText} style={styles.freelancerBio} numberOfLines={2}>
                            {item.services.slice(0, 2).map((service) => service.service_name).join(" • ")}
                          </T>
                          <T weight="regular" color={palette.subText} style={styles.freelancerHint} numberOfLines={1}>
                            From ₹{Math.round(item.min_cost_amount).toLocaleString()} • Fastest {formatServiceDuration(item.min_delivery_days)}
                          </T>
                        </View>
                        <View style={styles.freelancerRight}>
                          <Ionicons name="chevron-forward" size={15} color={palette.subText} />
                        </View>
                      </SurfaceCard>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 14,
  },
  searchBox: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  filtersCard: {
    padding: 10,
    gap: 8,
  },
  filterRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipText: {
    fontSize: 10,
    lineHeight: 13,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  sectionMeta: {
    fontSize: 11,
    lineHeight: 14,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCell: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  centerWrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  stack: {
    gap: 8,
  },
  freelancerCard: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 14,
    lineHeight: 18,
  },
  freelancerName: {
    fontSize: 13,
    lineHeight: 17,
  },
  freelancerBio: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  freelancerHint: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
  },
  freelancerRight: {
    alignItems: "flex-end",
    gap: 5,
  },
  emptyCard: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  emptySub: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
  },
});
