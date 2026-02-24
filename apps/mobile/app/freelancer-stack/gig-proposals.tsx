import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
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
import { useAcceptProposal, useGigProposals } from "@/hooks/useGig";
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

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Proposals</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Review and shortlist applicants</T>
          </View>
        </View>
        <View style={styles.feedbackWrap}>
          <LoadingState rows={3} />
        </View>
      </FlowScreen>
    );
  }

  if (error) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Proposals</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Review and shortlist applicants</T>
          </View>
        </View>
        <View style={styles.feedbackWrap}>
          <ErrorState title="Failed to load proposals" message={error.message} onRetry={() => refetch()} />
        </View>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
          <Ionicons name="arrow-back" size={15} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Proposals</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Review and shortlist applicants</T>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={[styles.searchBar, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}>
            <Ionicons name="search" size={15} color={palette.subText} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Search by name or keywords"
              placeholderTextColor={palette.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={palette.subText} />
              </TouchableOpacity>
            ) : null}
          </View>

          <SurfaceCard style={styles.summaryCard}>
            <T weight="regular" color={palette.subText} style={styles.summaryLabel}>Total proposals</T>
            <T weight="medium" color={palette.text} style={styles.summaryCount}>
              {proposals.length}
            </T>
          </SurfaceCard>

          {proposals.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No Proposals Yet"
              subtitle={searchQuery ? "Try adjusting your search" : "No one has submitted a proposal yet."}
            />
          ) : (
            <View style={styles.stack}>
              {proposals.map((p) => {
                const statusColor =
                  p.status === "pending"
                    ? "#FF9F0A"
                    : p.status === "accepted"
                      ? "#34C759"
                      : p.status === "rejected"
                        ? "#FF3B30"
                        : palette.subText;
                const statusBg =
                  p.status === "pending"
                    ? "rgba(255,159,10,0.12)"
                    : p.status === "accepted"
                      ? "rgba(52,199,89,0.12)"
                      : p.status === "rejected"
                        ? "rgba(255,59,48,0.12)"
                        : palette.border;

                return (
                  <SurfaceCard key={p.id} style={styles.card}>
                    <View style={styles.personRow}>
                      <Avatar source={p.freelancer?.avatar_url ? { uri: p.freelancer.avatar_url } : undefined} size={40} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>
                          {p.freelancer?.full_name || p.freelancer?.handle || "Freelancer"}
                        </T>
                        <View style={[styles.statusChip, { backgroundColor: statusBg }]}> 
                          <T weight="regular" color={statusColor} style={styles.statusText}>
                            {p.status.toUpperCase()}
                          </T>
                        </View>
                      </View>
                    </View>

                    <View style={styles.kpiRow}>
                      <View style={[styles.kpiItem, { backgroundColor: palette.border }]}> 
                        <T weight="regular" color={palette.subText} style={styles.kpiLabel}>Price</T>
                        <T weight="medium" color={palette.text} style={styles.kpiValue}>{formatAmount(p.proposed_amount)}</T>
                      </View>
                      <View style={[styles.kpiItem, { backgroundColor: palette.border }]}> 
                        <T weight="regular" color={palette.subText} style={styles.kpiLabel}>Timeline</T>
                        <T weight="medium" color={palette.text} style={styles.kpiValue}>
                          {p.estimated_days ? `${p.estimated_days} days` : "Flexible"}
                        </T>
                      </View>
                    </View>

                    <T weight="regular" color={palette.subText} style={styles.coverText} numberOfLines={3}>
                      {p.cover_letter}
                    </T>

                    {p.status === "pending" ? (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={[styles.secondaryBtn, { backgroundColor: palette.border }]}
                          onPress={() => nav.push(`/freelancer-stack/freelancer-profile?id=${p.freelancer_id}`)}
                          activeOpacity={0.84}
                        >
                          <T weight="regular" color={palette.text} style={styles.btnText}>View Profile</T>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.primaryBtn, { backgroundColor: palette.accent }]}
                          onPress={() => handleAccept(p)}
                          disabled={acceptMutation.isPending}
                          activeOpacity={0.84}
                        >
                          {acceptMutation.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <T weight="medium" color="#fff" style={styles.btnText}>Accept</T>
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
  feedbackWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
  },
  searchBar: {
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
  summaryCard: {
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  summaryCount: {
    marginTop: 3,
    fontSize: 18,
    lineHeight: 23,
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
  statusChip: {
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
  kpiItem: {
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
