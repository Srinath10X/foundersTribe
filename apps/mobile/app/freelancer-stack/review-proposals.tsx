import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useAcceptProposal, useGig, useGigProposals } from "@/hooks/useGig";
import type { Proposal } from "@/types/gig";

export default function ReviewProposalsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { gigId } = useLocalSearchParams<{ gigId?: string }>();

  const [sortBy, setSortBy] = useState<"lowest" | "highest">("lowest");

  const { data: gig } = useGig(gigId);
  const { data, isLoading, error, refetch } = useGigProposals(gigId);
  const acceptMutation = useAcceptProposal();

  const proposals = useMemo(() => {
    const list = [...(data?.items ?? [])];
    list.sort((a, b) => {
      const amountA = parseFloat(a.proposed_amount);
      const amountB = parseFloat(b.proposed_amount);
      return sortBy === "lowest" ? amountA - amountB : amountB - amountA;
    });
    return list;
  }, [data?.items, sortBy]);

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString()}`;
  };

  const handleAccept = async (proposal: Proposal) => {
    if (!gigId) return;
    try {
      const result = await acceptMutation.mutateAsync({ proposalId: proposal.id, gigId });
      if (!result?.contract_id) {
        Alert.alert("Accept failed", "Contract id was not returned. Please refresh and try again.");
        return;
      }
      nav.push(`/freelancer-stack/contract-details?contractId=${result.contract_id}`);
    } catch (err) {
      console.error("Failed to accept proposal:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as any).message)
          : "Unable to accept proposal right now.";
      Alert.alert("Accept failed", message);
    }
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
          onPress={nav.back}
        >
          <Ionicons name="arrow-back" size={15} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>
            Review Proposals
          </T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
            Evaluate and accept the best fit
          </T>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <LoadingState rows={3} />
        </View>
      ) : error ? (
        <View style={styles.loadingWrap}>
          <ErrorState title="Failed to load proposals" message={error.message} onRetry={() => refetch()} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <SurfaceCard style={styles.projectCard}>
              <T weight="regular" color={palette.subText} style={styles.projectLabel}>
                Project
              </T>
              <T weight="medium" color={palette.text} style={styles.projectTitle} numberOfLines={2}>
                {gig?.title || "Untitled Gig"}
              </T>

              <View style={styles.projectMetaRow}>
                <TouchableOpacity
                  activeOpacity={0.86}
                  style={[styles.sortBtn, { backgroundColor: palette.border }]}
                  onPress={() => setSortBy(sortBy === "lowest" ? "highest" : "lowest")}
                >
                  <T weight="regular" color={palette.text} style={styles.sortText}>
                    Sort: {sortBy === "lowest" ? "Lowest price" : "Highest price"}
                  </T>
                  <Ionicons name="swap-vertical" size={13} color={palette.subText} />
                </TouchableOpacity>

                <T weight="regular" color={palette.subText} style={styles.countText}>
                  {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
                </T>
              </View>
            </SurfaceCard>

            {proposals.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="No Proposals"
                subtitle="No freelancers have submitted proposals yet."
              />
            ) : (
              <View style={styles.stack}>
                {proposals.map((p) => {
                  const pending = p.status === "pending";
                  const statusColor =
                    p.status === "pending" ? "#FF9F0A" : p.status === "accepted" ? "#34C759" : palette.subText;
                  const statusBg =
                    p.status === "pending"
                      ? "rgba(255,159,10,0.12)"
                      : p.status === "accepted"
                        ? "rgba(52,199,89,0.12)"
                        : palette.border;

                  return (
                    <SurfaceCard key={p.id} style={styles.card}>
                      <View style={styles.personRow}>
                        <Avatar source={p.freelancer?.avatar_url ? { uri: p.freelancer.avatar_url } : undefined} size={40} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>
                            {p.freelancer?.full_name || p.freelancer?.handle || "Freelancer"}
                          </T>
                          <View style={[styles.statusPill, { backgroundColor: statusBg }]}> 
                            <T weight="regular" color={statusColor} style={styles.statusText}>
                              {p.status.toUpperCase()}
                            </T>
                          </View>
                        </View>
                      </View>

                      <View style={styles.kpiRow}>
                        <View style={[styles.kpi, { backgroundColor: palette.border }]}> 
                          <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
                            Proposed
                          </T>
                          <T weight="medium" color={palette.text} style={styles.kpiValue}>
                            {formatAmount(p.proposed_amount)}
                          </T>
                        </View>
                        <View style={[styles.kpi, { backgroundColor: palette.border }]}> 
                          <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
                            Timeline
                          </T>
                          <T weight="medium" color={palette.text} style={styles.kpiValue}>
                            {p.estimated_days ? `${p.estimated_days} days` : "Flexible"}
                          </T>
                        </View>
                      </View>

                      <T weight="regular" color={palette.subText} style={styles.coverText} numberOfLines={3}>
                        {p.cover_letter}
                      </T>

                      {pending ? (
                        <View style={styles.actions}>
                          <TouchableOpacity
                            style={[styles.secondaryBtn, { backgroundColor: palette.border }]}
                            onPress={() => nav.push(`/freelancer-stack/freelancer-profile?id=${p.freelancer_id}`)}
                            activeOpacity={0.85}
                          >
                            <T weight="regular" color={palette.text} style={styles.btnText}>
                              View Profile
                            </T>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: palette.accent }]}
                            onPress={() => handleAccept(p)}
                            disabled={acceptMutation.isPending}
                            activeOpacity={0.85}
                          >
                            {acceptMutation.isPending ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <T weight="medium" color="#fff" style={styles.btnText}>
                                Accept
                              </T>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </SurfaceCard>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
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
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  loadingWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
  },
  projectCard: {
    padding: 12,
  },
  projectLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  projectTitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
  },
  projectMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sortText: {
    fontSize: 11,
    lineHeight: 14,
  },
  countText: {
    fontSize: 11,
    lineHeight: 14,
  },
  stack: {
    gap: 8,
  },
  card: {
    padding: 12,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: {
    fontSize: 13,
    lineHeight: 17,
  },
  statusPill: {
    marginTop: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 10,
    lineHeight: 13,
  },
  kpiRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  kpi: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
  },
  kpiLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  kpiValue: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 17,
  },
  coverText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 15,
  },
  actions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  btnText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
