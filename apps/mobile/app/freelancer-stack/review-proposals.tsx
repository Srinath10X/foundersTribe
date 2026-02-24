import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { useGig, useGigProposals, useAcceptProposal, useRejectProposal } from "@/hooks/useGig";
import type { Proposal } from "@/types/gig";

export default function ReviewProposalsScreen() {
  const { palette, isDark } = useFlowPalette();
  const nav = useFlowNav();
  const { gigId } = useLocalSearchParams<{ gigId?: string }>();
  const [sortBy, setSortBy] = useState<"lowest" | "highest">("lowest");

  const { data: gig } = useGig(gigId);
  const { data, isLoading, error, refetch } = useGigProposals(gigId);
  const acceptMutation = useAcceptProposal();
  const rejectMutation = useRejectProposal();

  const proposals = [...(data?.items ?? [])].sort((a, b) => {
    const amountA = parseFloat(a.proposed_amount);
    const amountB = parseFloat(b.proposed_amount);
    return sortBy === "lowest" ? amountA - amountB : amountB - amountA;
  });

  const handleAccept = async (proposal: Proposal) => {
    if (!gigId) return;
    try {
      const result = await acceptMutation.mutateAsync({
        proposalId: proposal.id,
        gigId,
      });
      nav.push(`/freelancer-stack/contract-details?contractId=${result.contract_id}`);
    } catch (err) {
      console.error("Failed to accept proposal:", err);
    }
  };

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <FlowScreen>
        <FlowTopBar title="Review Proposals" onLeftPress={nav.back} />
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <LoadingState rows={3} />
        </View>
      </FlowScreen>
    );
  }

  if (error) {
    return (
      <FlowScreen>
        <FlowTopBar title="Review Proposals" onLeftPress={nav.back} />
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <ErrorState
            title="Failed to load proposals"
            message={error.message}
            onRetry={() => refetch()}
          />
        </View>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen>
      <FlowTopBar title="Review Proposals" onLeftPress={nav.back} right="ellipsis-horizontal" onRightPress={() => {}} />

      <View style={[styles.top, { borderBottomColor: palette.border }]}>
        <T weight="semiBold" color={palette.subText} style={styles.projectLabel}>PROJECT</T>
        <T weight="bold" color={palette.accent} style={styles.projectTitle}>
          {gig?.title || "Loading..."}
        </T>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: palette.card }]}
          onPress={() => setSortBy(sortBy === "lowest" ? "highest" : "lowest")}
        >
          <T weight="semiBold" color={palette.text} style={{ fontSize: 15 }}>
            Sort by: {sortBy === "lowest" ? "Lowest Price" : "Highest Price"}
          </T>
          <Ionicons name="chevron-down" size={16} color={palette.subText} />
        </TouchableOpacity>
        <T weight="medium" color={palette.subText} style={{ fontSize: 13 }}>
          {proposals.length} Proposal{proposals.length !== 1 ? "s" : ""}
        </T>
      </View>

      <View style={styles.list}>
        {proposals.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No Proposals"
            subtitle="No freelancers have submitted proposals yet."
          />
        ) : (
          proposals.map((p) => (
            <SurfaceCard
              key={p.id}
              style={[
                styles.card,
                isDark ? null : { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
              ]}
            >
              <View style={styles.personRow}>
                <Avatar
                  source={p.freelancer?.avatar_url ? { uri: p.freelancer.avatar_url } : undefined}
                  size={50}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T weight="bold" color={palette.text} style={{ fontSize: 18 }} numberOfLines={1}>
                    {p.freelancer?.full_name || p.freelancer?.handle || "Freelancer"}
                  </T>
                  <View style={styles.rating}>
                    <View style={[styles.statusChip, {
                      backgroundColor: p.status === "pending" ? "rgba(255,159,10,0.12)" :
                        p.status === "accepted" ? "rgba(52,199,89,0.12)" :
                        "rgba(142,142,147,0.12)"
                    }]}>
                      <T weight="semiBold" color={
                        p.status === "pending" ? "#FF9F0A" :
                        p.status === "accepted" ? "#34C759" :
                        palette.subText
                      } style={{ fontSize: 11 }}>{p.status.toUpperCase()}</T>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.kpis}>
                <View style={[styles.kpiItem, { backgroundColor: palette.surface }]}>
                  <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>PROPOSED PRICE</T>
                  <T weight="bold" color={palette.text} style={styles.kpiValue}>
                    {formatAmount(p.proposed_amount)}
                  </T>
                </View>
                <View style={[styles.kpiItem, { backgroundColor: palette.surface }]}>
                  <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>TIMELINE</T>
                  <T weight="bold" color={palette.text} style={styles.kpiValue}>
                    {p.estimated_days ? `${p.estimated_days} days` : "Flexible"}
                  </T>
                </View>
              </View>

              <T color={palette.subText} style={styles.desc} numberOfLines={3}>{p.cover_letter}</T>

              {p.status === "pending" && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.secondary, { backgroundColor: palette.surface }]}
                    onPress={() => nav.push(`/freelancer-stack/freelancer-profile?id=${p.freelancer_id}`)}
                  >
                    <T weight="bold" color={palette.text} style={styles.btnTxt}>View Profile</T>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primary, { backgroundColor: palette.accent }]}
                    onPress={() => handleAccept(p)}
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <T weight="bold" color="#fff" style={styles.btnTxt}>Accept</T>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </SurfaceCard>
          ))
        )}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  projectLabel: { fontSize: 12, letterSpacing: 1.2 },
  projectTitle: { fontSize: 21, marginTop: 4, lineHeight: 28 },
  filters: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 16, gap: 12 },
  sortBtn: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  list: { paddingHorizontal: 20, paddingTop: 14, gap: 12 },
  card: { padding: 14 },
  personRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  rating: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  kpis: { flexDirection: "row", gap: 10, marginTop: 14 },
  kpiItem: { flex: 1, borderRadius: 12, padding: 11 },
  kpiLabel: { fontSize: 11, letterSpacing: 0.6 },
  kpiValue: { fontSize: 18, marginTop: 4 },
  desc: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondary: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primary: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnTxt: { fontSize: 15 },
});
