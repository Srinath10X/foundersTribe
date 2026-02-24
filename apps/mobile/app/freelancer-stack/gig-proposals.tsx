import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
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
import { EmptyState } from "@/components/freelancer/EmptyState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { useGigProposals, useAcceptProposal } from "@/hooks/useGig";
import type { Proposal } from "@/types/gig";

export default function GigProposalsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { gigId } = useLocalSearchParams<{ gigId?: string }>();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error, refetch } = useGigProposals(gigId);
  const acceptMutation = useAcceptProposal();

  const proposals = (data?.items ?? []).filter((p) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.cover_letter.toLowerCase().includes(query) ||
      p.freelancer?.full_name?.toLowerCase().includes(query) ||
      p.freelancer?.handle?.toLowerCase().includes(query)
    );
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
        <FlowTopBar title="Proposals" onLeftPress={nav.back} />
        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
          <LoadingState rows={3} />
        </View>
      </FlowScreen>
    );
  }

  if (error) {
    return (
      <FlowScreen>
        <FlowTopBar title="Proposals" onLeftPress={nav.back} />
        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
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
      <FlowTopBar
        title="Proposals"
        onLeftPress={nav.back}
        right="ellipsis-horizontal"
        onRightPress={() => {}}
      />

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Ionicons name="search" size={18} color={palette.subText} />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder="Search by name or keyword..."
          placeholderTextColor={palette.subText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={palette.subText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results Summary */}
      <View style={[styles.summaryCard, { backgroundColor: palette.accentSoft }]}>
        <View style={styles.summaryContent}>
          <T weight="bold" color={palette.accent} style={styles.summaryCount}>
            {proposals.length}
          </T>
          <T weight="medium" color={palette.accent} style={styles.summaryLabel}>
            proposal{proposals.length !== 1 ? "s" : ""} found
          </T>
        </View>
        <View style={[styles.bestTag, { backgroundColor: palette.surface }]}>
          <T weight="bold" color={palette.accent} style={styles.bestText}>BEST MATCHES</T>
        </View>
      </View>

      <View style={styles.listWrap}>
        {proposals.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No Proposals Yet"
            subtitle={searchQuery ? "Try adjusting your search" : "No one has submitted a proposal for this gig yet."}
          />
        ) : (
          proposals.map((p) => (
            <SurfaceCard key={p.id} style={styles.card}>
              <View style={styles.personRow}>
                <Avatar
                  source={p.freelancer?.avatar_url ? { uri: p.freelancer.avatar_url } : undefined}
                  size={46}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T weight="bold" color={palette.text} style={styles.name} numberOfLines={1}>
                    {p.freelancer?.full_name || p.freelancer?.handle || "Freelancer"}
                  </T>
                  <View style={styles.ratingRow}>
                    <View style={[styles.statusChip, {
                      backgroundColor: p.status === "pending" ? "rgba(255,159,10,0.12)" :
                        p.status === "accepted" ? "rgba(52,199,89,0.12)" :
                        p.status === "rejected" ? "rgba(255,59,48,0.12)" :
                        "rgba(142,142,147,0.12)"
                    }]}>
                      <T weight="semiBold" color={
                        p.status === "pending" ? "#FF9F0A" :
                        p.status === "accepted" ? "#34C759" :
                        p.status === "rejected" ? "#FF3B30" :
                        palette.subText
                      } style={styles.statusText}>{p.status.toUpperCase()}</T>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.kpiRow}>
                <View style={[styles.kpi, { backgroundColor: palette.surface }]}>
                  <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>PRICE</T>
                  <T weight="bold" color={palette.text} style={styles.kpiValue}>
                    {formatAmount(p.proposed_amount)}
                  </T>
                </View>
                <View style={[styles.kpi, { backgroundColor: palette.surface }]}>
                  <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>TIMELINE</T>
                  <T weight="bold" color={palette.text} style={styles.kpiValue}>
                    {p.estimated_days ? `${p.estimated_days} days` : "Flexible"}
                  </T>
                </View>
              </View>

              <T color={palette.subText} style={styles.blurb} numberOfLines={3}>
                {p.cover_letter}
              </T>

              {p.status === "pending" && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.secondary, { backgroundColor: palette.surface }]}
                    onPress={() => nav.push(`/freelancer-stack/freelancer-profile?id=${p.freelancer_id}`)}
                  >
                    <T weight="semiBold" color={palette.text} style={styles.btnText}>View Profile</T>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primary, { backgroundColor: palette.accent }]}
                    onPress={() => handleAccept(p)}
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <T weight="bold" color="#fff" style={styles.btnText}>Accept</T>
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 18,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  summaryCard: {
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryContent: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  summaryCount: {
    fontSize: 28,
  },
  summaryLabel: {
    fontSize: 14,
  },
  bestTag: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bestText: { fontSize: 11, letterSpacing: 0.5 },
  listWrap: { paddingHorizontal: 18, paddingTop: 16, gap: 12 },
  card: { padding: 16 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 18 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, letterSpacing: 0.5 },
  kpiRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  kpi: { flex: 1, borderRadius: 12, padding: 12 },
  kpiLabel: { fontSize: 10, letterSpacing: 0.7 },
  kpiValue: { fontSize: 18, marginTop: 4 },
  blurb: { fontSize: 14, marginTop: 12, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondary: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primary: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnText: { fontSize: 14, letterSpacing: 0.3 },
});
