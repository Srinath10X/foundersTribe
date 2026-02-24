import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  Badge,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useDeleteGig, useMyGigs } from "@/hooks/useGig";
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
  const activeCount = gigs.filter((g) => g.status === "in_progress" || g.status === "open").length;
  const completedCount = gigs.filter((g) => g.status === "completed").length;

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
      ],
    );
  };

  const getStatusTone = (status: string) => {
    if (status === "open" || status === "in_progress") return "progress" as const;
    if (status === "completed") return "success" as const;
    return "neutral" as const;
  };

  const renderKpi = () => (
    <View style={styles.kpiRow}>
      <SurfaceCard style={styles.kpiCard}>
        <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
          Active
        </T>
        <T weight="medium" color={palette.text} style={styles.kpiValue}>
          {activeCount}
        </T>
      </SurfaceCard>
      <SurfaceCard style={styles.kpiCard}>
        <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
          Completed
        </T>
        <T weight="medium" color={palette.text} style={styles.kpiValue}>
          {completedCount}
        </T>
      </SurfaceCard>
    </View>
  );

  const renderItem = ({ item: gig }: { item: Gig }) => {
    const isDeleting = deletingId === gig.id;
    const budgetDisplay = gig.budget_max ?? gig.budget ?? 0;

    return (
      <TouchableOpacity activeOpacity={0.86} onPress={() => router.push(`/freelancer-stack/gig-details?id=${gig.id}`)}>
        <SurfaceCard style={[styles.card, isDeleting ? { opacity: 0.55 } : null]}>
          <View style={styles.cardHeader}>
            <T weight="medium" color={palette.text} style={styles.cardTitle} numberOfLines={2}>
              {gig.title}
            </T>
            <Badge label={gig.status.replace("_", " ").toUpperCase()} tone={getStatusTone(gig.status)} />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="wallet-outline" size={13} color={palette.subText} />
              <T weight="regular" color={palette.subText} style={styles.metaText}>
                ₹{budgetDisplay.toLocaleString()}
              </T>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={palette.subText} />
              <T weight="regular" color={palette.subText} style={styles.metaText}>
                {new Date(gig.created_at).toLocaleDateString()}
              </T>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.borderLight }]} />

          <View style={styles.actionsRow}>
            <View style={styles.leftActions}>
              <TouchableOpacity
                onPress={() => router.push(`/freelancer-stack/post-gig?id=${gig.id}`)}
                style={styles.actionBtn}
                activeOpacity={0.75}
              >
                <Ionicons name="pencil" size={14} color={palette.accent} />
                <T weight="regular" color={palette.accent} style={styles.actionText}>
                  Edit
                </T>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDelete(gig.id, gig.title)}
                style={styles.actionBtn}
                disabled={isDeleting}
                activeOpacity={0.75}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                )}
                <T weight="regular" color="#FF3B30" style={styles.actionText}>
                  Delete
                </T>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => nav.push(`/freelancer-stack/gig-proposals?gigId=${gig.id}`)}
              style={[styles.proposalsBtn, { backgroundColor: palette.accentSoft }]}
              activeOpacity={0.8}
            >
              <T weight="medium" color={palette.accent} style={styles.proposalsText}>
                Proposals
              </T>
              <Ionicons name="chevron-forward" size={13} color={palette.accent} />
            </TouchableOpacity>
          </View>
        </SurfaceCard>
      </TouchableOpacity>
    );
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <T weight="medium" color={palette.text} style={styles.pageTitle}>
          My Gigs
        </T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
          Track status and review proposals
        </T>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <LoadingState rows={4} />
        </View>
      ) : (
        <FlatList
          data={gigs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderKpi}
          contentContainerStyle={styles.listContent}
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
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
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
  loadingWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 120,
    gap: 8,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    padding: 11,
  },
  kpiLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  kpiValue: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 23,
  },
  card: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 14,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    lineHeight: 14,
  },
  proposalsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  proposalsText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
