import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, TouchableOpacity, View, FlatList, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import {
  Avatar,
  Badge,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
  PrimaryButton
} from "@/components/community/freelancerFlow/shared";
import { gigService, Gig } from "@/lib/gigService";

export default function MyGigsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const router = useRouter();

  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMyGigs = async () => {
    try {
      const data = await gigService.getGigs();
      // Assuming backend handles client context via token or we filter client_id here.
      // E.g. const data = await gigService.getGigs({ client_id: myUserId })
      setGigs(data || []);
    } catch (err: any) {
      console.error("Failed to load my gigs:", err);
      Alert.alert("Error", err.message || "Could not load gigs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyGigs();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyGigs();
  }, []);

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
              await gigService.deleteGig(gigId);
              // Refresh list
              setGigs(prev => prev.filter(g => g.id !== gigId));
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete gig.");
            } finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
  };

  const activeCount = gigs.filter(g => g.status === "in_progress" || g.status === "open").length;
  const completedCount = gigs.filter(g => g.status === "completed").length;
  const draftCount = gigs.filter(g => g.status === "draft").length;

  const renderHeader = () => (
    <>
      <View style={styles.summaryRow}>
        <SurfaceCard style={styles.summaryCard}>
          <T weight="semiBold" color={palette.subText} style={styles.summaryLabel}>ACTIVE</T>
          <T weight="bold" color={palette.text} style={styles.summaryValue}>{activeCount}</T>
        </SurfaceCard>
        <SurfaceCard style={styles.summaryCard}>
          <T weight="semiBold" color={palette.subText} style={styles.summaryLabel}>COMPLETED</T>
          <T weight="bold" color={palette.text} style={styles.summaryValue}>{completedCount}</T>
        </SurfaceCard>
        <SurfaceCard style={styles.summaryCard}>
          <T weight="semiBold" color={palette.subText} style={styles.summaryLabel}>DRAFT / PEND</T>
          <T weight="bold" color={palette.text} style={styles.summaryValue}>{draftCount}</T>
        </SurfaceCard>
      </View>
    </>
  );

  const renderItem = ({ item: gig }: { item: Gig }) => {
    const isDeleting = deletingId === gig.id;
    return (
      <SurfaceCard style={[styles.card, isDeleting && { opacity: 0.5 }]}>
        <View style={styles.cardHead}>
          <T weight="bold" color={palette.text} style={styles.cardTitle} numberOfLines={2}>
            {gig.title}
          </T>
          <Badge label={gig.status.toUpperCase()} tone={gig.status === "open" ? "progress" : gig.status === "completed" ? "success" : "neutral"} />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="wallet-outline" size={15} color={palette.subText} />
            <T weight="medium" color={palette.subText} style={styles.metaText}>
              ₹{gig.budget?.toLocaleString() || "..."}
            </T>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color={palette.subText} />
            <T weight="medium" color={palette.subText} style={styles.metaText}>
              Posted: {new Date(gig.created_at).toLocaleDateString()}
            </T>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        <View style={styles.cardBottom}>
          <View style={styles.actionGroup}>
            <TouchableOpacity
              onPress={() => router.push(`/freelancer-stack/post-gig?id=${gig.id}`)}
              style={styles.iconBtn}
            >
              <Ionicons name="pencil" size={18} color={palette.accent} />
              <T weight="semiBold" color={palette.accent} style={styles.btnLabel}>Edit</T>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDelete(gig.id, gig.title)}
              style={styles.iconBtn}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              )}
              <T weight="semiBold" color="#FF3B30" style={styles.btnLabel}>Delete</T>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => nav.push("/freelancer-stack/gig-proposals")} activeOpacity={0.8} style={styles.viewProposalsBtn}>
            <T weight="bold" color={palette.accent} style={styles.actionText}>Proposals</T>
            <Ionicons name="chevron-forward" size={16} color={palette.accent} />
          </TouchableOpacity>
        </View>
      </SurfaceCard>
    );
  };

  return (
    <FlowScreen>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View>
          <T weight="semiBold" color={palette.subText} style={styles.smallLabel}>Your Workspace</T>
          <T weight="bold" color={palette.text} style={styles.title}>My Gigs</T>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => nav.push("/freelancer-stack/post-gig")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color={palette.accent} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
          <T color={palette.subText} style={{ marginTop: 16 }}>Loading your gigs...</T>
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
            <SurfaceCard style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={48} color={palette.border} />
              <T weight="bold" color={palette.text} style={styles.emptyTitle}>No Gigs Yet</T>
              <T color={palette.subText} style={styles.emptySubtitle}>Post a gig to start finding top talent.</T>
              <PrimaryButton label="Post a Gig" onPress={() => nav.push("/freelancer-stack/post-gig")} style={styles.emptyBtn} />
            </SurfaceCard>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  smallLabel: { fontSize: 11, letterSpacing: 0.8 },
  title: { fontSize: 26 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, gap: 12 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  summaryCard: { flex: 1, paddingVertical: 10, alignItems: "center" },
  summaryLabel: { fontSize: 10, letterSpacing: 0.8 },
  summaryValue: { fontSize: 18, marginTop: 4 },
  card: { padding: 16, marginBottom: 4 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 },
  cardTitle: { fontSize: 18, flex: 1, flexShrink: 1, paddingRight: 2 },
  metaRow: { gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 7, minWidth: 0 },
  metaText: { fontSize: 13, flexShrink: 1 },
  divider: { height: 1, marginVertical: 14 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  actionGroup: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  btnLabel: { fontSize: 13 },
  viewProposalsBtn: { flexDirection: "row", alignItems: "center", gap: 2, padding: 6, opacity: 0.9 },
  actionText: { fontSize: 13, flexShrink: 1 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyCard: { padding: 40, alignItems: "center", borderRadius: 16, marginTop: 24 },
  emptyTitle: { fontSize: 18, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: "center", marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
});
