import { Ionicons } from "@expo/vector-icons";
import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View, FlatList, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import {
  Badge,
  FlowScreen,
  T,
  useFlowNav,
  useFlowPalette,
  PrimaryButton,
} from "@/components/community/freelancerFlow/shared";
import { StatCard } from "@/components/freelancer/StatCard";
import { SectionHeader } from "@/components/freelancer/SectionHeader";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { SP, RADIUS, SHADOWS, SCREEN_PADDING } from "@/components/freelancer/designTokens";
import { useMyGigs, useDeleteGig } from "@/hooks/useGig";
import type { Gig } from "@/types/gig";


export default function MyGigsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const router = useRouter();

  const { data: gigsData, isLoading: loading, refetch } = useMyGigs();
  const deleteGigMutation = useDeleteGig();
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const gigs = gigsData?.items ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDelete = (gigId: string, gigTitle: string) => {
    Alert.alert(
      "Delete Gig",
      `Are you sure you want to delete '${gigTitle}'? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(gigId);
              await deleteGigMutation.mutateAsync(gigId);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete gig.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const activeCount = gigs.filter((g) => g.status === "in_progress" || g.status === "open").length;
  const completedCount = gigs.filter((g) => g.status === "completed").length;

  const renderHeader = () => (
    <View style={styles.statsRow}>
      <StatCard label="Active" value={activeCount} accentColor={palette.accent} />
      <StatCard label="Completed" value={completedCount} accentColor={palette.success} />
    </View>
  );

  const getStatusTone = (status: string) => {
    if (status === "open") return "progress" as const;
    if (status === "completed") return "success" as const;
    if (status === "in_progress") return "progress" as const;
    return "neutral" as const;
  };

  const renderItem = ({ item: gig }: { item: Gig }) => {
    const isDeleting = deletingId === gig.id;
    const budgetDisplay = gig.budget_max ?? gig.budget ?? 0;

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => router.push(`/freelancer-stack/gig-details?id=${gig.id}`)}
      >
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.borderLight, opacity: isDeleting ? 0.5 : 1 }]}>
          {/* Header: Title + Badge */}
          <View style={styles.cardHead}>
            <T weight="bold" color={palette.text} style={styles.cardTitle} numberOfLines={2}>
              {gig.title}
            </T>
            <Badge label={gig.status.toUpperCase()} tone={getStatusTone(gig.status)} />
          </View>

          {/* Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="wallet-outline" size={14} color={palette.subText} />
              <T weight="medium" color={palette.subText} style={styles.metaText}>
                ₹{budgetDisplay.toLocaleString()}
              </T>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={palette.subText} />
              <T weight="medium" color={palette.subText} style={styles.metaText}>
                {new Date(gig.created_at).toLocaleDateString()}
              </T>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* Actions */}
          <View style={styles.cardActions}>
            <View style={styles.actionGroup}>
              <TouchableOpacity
                onPress={() => router.push(`/freelancer-stack/post-gig?id=${gig.id}`)}
                style={styles.actionBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={16} color={palette.accent} />
                <T weight="semiBold" color={palette.accent} style={styles.actionLabel}>
                  Edit
                </T>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDelete(gig.id, gig.title)}
                style={styles.actionBtn}
                disabled={isDeleting}
                activeOpacity={0.7}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                )}
                <T weight="semiBold" color="#FF3B30" style={styles.actionLabel}>
                  Delete
                </T>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => nav.push(`/freelancer-stack/gig-proposals?gigId=${gig.id}`)}
              activeOpacity={0.8}
              style={styles.proposalsBtn}
            >
              <T weight="bold" color={palette.accent} style={styles.proposalsText}>
                Proposals
              </T>
              <Ionicons name="chevron-forward" size={14} color={palette.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlowScreen scroll={false}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.borderLight }]}>
        <View style={styles.headerContent}>
          <T weight="bold" color={palette.text} style={styles.headerTitle}>
            My Gigs
          </T>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <View style={styles.statsRow}>
            {[1, 2].map((i) => (
              <View
                key={i}
                style={[styles.statSkeleton, { backgroundColor: palette.card, borderColor: palette.borderLight }]}
              />
            ))}
          </View>
          <LoadingState rows={3} style={{ marginTop: SP._16 }} />
        </View>
      ) : (
        <FlatList
          data={gigs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase-outline"
              title="No Gigs Yet"
              subtitle="Post your first gig to start finding top talent."
              ctaLabel="Post a Gig"
              onCtaPress={() => nav.push("/freelancer-stack/post-gig")}
            />
          }
        />
      )}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: SP._20,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerContent: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.7,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.xl,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.card,
  },
  content: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SP._16,
    paddingBottom: SP._32,
    gap: SP._12,
  },
  loadingWrap: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SP._16,
  },
  statsRow: {
    flexDirection: "row",
    gap: SP._16,
    marginBottom: SP._24,
    flexWrap: "wrap",
  },
  statSkeleton: {
    flex: 1,
    minWidth: "45%",
    minHeight: 110,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  card: {
    padding: SP._16,
    paddingBottom: SP._20,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SP._8,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    flex: 1,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    gap: SP._16,
    marginTop: SP._12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP._8,
  },
  metaText: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: SP._16,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP._20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP._4,
  },
  actionLabel: {
    fontSize: 13,
  },
  proposalsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP._2,
    paddingVertical: SP._4,
    paddingHorizontal: SP._8,
  },
  proposalsText: {
    fontSize: 13,
  },
});
