import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Avatar,
  FlowScreen,
  PrimaryButton,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useApproveContract, useCompleteContract, useContract } from "@/hooks/useGig";

export default function ContractDetailsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { contractId } = useLocalSearchParams<{ contractId?: string }>();

  const { data: contract, isLoading, error, refetch } = useContract(contractId);
  const completeMutation = useCompleteContract();
  const approveMutation = useApproveContract();

  const formatAmount = (amount: string | number | undefined) => {
    if (!amount) return "-";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleComplete = async () => {
    if (!contract) return;
    try {
      await completeMutation.mutateAsync(contract.id);
    } catch (err) {
      console.error("Failed to mark contract complete:", err);
    }
  };

  const handleApprove = async () => {
    if (!contract) return;
    try {
      await approveMutation.mutateAsync(contract.id);
    } catch (err) {
      console.error("Failed to approve contract:", err);
    }
  };

  if (isLoading) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Contract Details</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Track progress and actions</T>
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <LoadingState rows={3} />
        </View>
      </FlowScreen>
    );
  }

  if (error || !contract) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Contract Details</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Track progress and actions</T>
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <ErrorState title="Failed to load contract" message={error?.message || "Contract not found"} onRetry={() => refetch()} />
        </View>
      </FlowScreen>
    );
  }

  const freelancer = contract.freelancer;
  const gig = contract.gig;
  const freelancerName = freelancer?.full_name || freelancer?.handle || "Freelancer";
  const freelancerAvatar = freelancer?.avatar_url;

  const contractValue = gig?.budget_max
    ? formatAmount(gig.budget_max)
    : gig?.budget_min
      ? formatAmount(gig.budget_min)
      : "-";

  const statusColor =
    contract.status === "active"
      ? "#34C759"
      : contract.status === "completed"
        ? "#007AFF"
        : contract.status === "cancelled"
          ? "#FF3B30"
          : palette.subText;
  const statusLabel = contract.status.charAt(0).toUpperCase() + contract.status.slice(1);

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
          <Ionicons name="arrow-back" size={15} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Contract Details</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Track progress and actions</T>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <SurfaceCard style={styles.card}>
            <View style={styles.profileRow}>
              <Avatar source={freelancerAvatar ? { uri: freelancerAvatar } : undefined} size={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>
                  {freelancerName}
                </T>
                <T weight="regular" color={palette.subText} style={styles.role} numberOfLines={1}>
                  {freelancer?.bio || "Freelancer"}
                </T>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}> 
                  <T weight="regular" color={statusColor} style={styles.statusText}>
                    {statusLabel.toUpperCase()}
                  </T>
                </View>
              </View>
              <TouchableOpacity onPress={() => nav.push(`/freelancer-stack/freelancer-profile?id=${contract.freelancer_id}`)}>
                <T weight="regular" color={palette.accent} style={styles.linkText}>View</T>
              </TouchableOpacity>
            </View>
          </SurfaceCard>

          <View style={styles.kpiRow}>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>Contract Value</T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>{contractValue}</T>
            </SurfaceCard>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>Started</T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>{formatDate(contract.started_at)}</T>
            </SurfaceCard>
          </View>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.blockTitle}>Project Overview</T>
            <T weight="regular" color={palette.subText} style={styles.blockBody}>
              {gig?.description || "No description available."}
            </T>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.blockTitle}>Deliverables Status</T>

            <View style={styles.progressRow}>
              <Ionicons name="checkmark-circle" size={15} color="#1D9A5B" />
              <T weight="regular" color={palette.subText} style={styles.progressText}>Contract created</T>
            </View>

            <View style={styles.progressRow}>
              <Ionicons
                name={contract.freelancer_marked_complete ? "checkmark-circle" : "ellipse-outline"}
                size={15}
                color={contract.freelancer_marked_complete ? "#1D9A5B" : palette.subText}
              />
              <T weight="regular" color={palette.subText} style={styles.progressText}>Freelancer marked complete</T>
            </View>

            <View style={styles.progressRow}>
              <Ionicons
                name={contract.founder_approved ? "checkmark-circle" : "ellipse-outline"}
                size={15}
                color={contract.founder_approved ? "#1D9A5B" : palette.subText}
              />
              <T weight="regular" color={palette.subText} style={styles.progressText}>Founder approved</T>
            </View>
          </SurfaceCard>

          <View style={styles.ctaWrap}>
            <PrimaryButton
              label="Open Chat"
              icon="chatbubble-ellipses-outline"
              onPress={() =>
                nav.push(
                  `/freelancer-stack/contract-chat-thread?contractId=${contract.id}&title=${encodeURIComponent(
                    `${freelancerName} • Contract Chat`,
                  )}`,
                )
              }
            />

            {contract.status === "active" && !contract.freelancer_marked_complete ? (
              <PrimaryButton
                label="Mark as Complete"
                icon="checkmark-done-outline"
                onPress={handleComplete}
                loading={completeMutation.isPending}
                style={{ marginTop: 8 }}
              />
            ) : null}

            {contract.status === "active" && contract.freelancer_marked_complete && !contract.founder_approved ? (
              <PrimaryButton
                label="Approve & Complete"
                icon="shield-checkmark-outline"
                onPress={handleApprove}
                loading={approveMutation.isPending}
                style={{ marginTop: 8 }}
              />
            ) : null}

            {contract.status === "completed" ? (
              <PrimaryButton
                label="Leave a Review"
                icon="star-outline"
                onPress={() =>
                  nav.push(`/freelancer-stack/leave-review?contractId=${contract.id}&revieweeId=${contract.freelancer_id}`)
                }
                style={{ marginTop: 8 }}
              />
            ) : null}
          </View>
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
  card: {
    padding: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: {
    fontSize: 13,
    lineHeight: 17,
  },
  role: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  statusPill: {
    marginTop: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 10,
    lineHeight: 13,
  },
  linkText: {
    fontSize: 11,
    lineHeight: 14,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCard: {
    flex: 1,
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
  blockTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  blockBody: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
  },
  progressRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressText: {
    fontSize: 11,
    lineHeight: 14,
  },
  ctaWrap: {
    marginTop: 4,
  },
});
