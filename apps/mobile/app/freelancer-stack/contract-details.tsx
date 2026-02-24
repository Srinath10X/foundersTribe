import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  PrimaryButton,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { useContract, useCompleteContract, useApproveContract } from "@/hooks/useGig";

export default function ContractDetailsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { contractId } = useLocalSearchParams<{ contractId?: string }>();

  const { data: contract, isLoading, error, refetch } = useContract(contractId);
  const completeMutation = useCompleteContract();
  const approveMutation = useApproveContract();

  const formatAmount = (amount: string | number | undefined) => {
    if (!amount) return "—";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <FlowScreen>
        <FlowTopBar title="Contract Details" onLeftPress={nav.back} />
        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
          <LoadingState rows={3} />
        </View>
      </FlowScreen>
    );
  }

  if (error || !contract) {
    return (
      <FlowScreen>
        <FlowTopBar title="Contract Details" onLeftPress={nav.back} />
        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
          <ErrorState
            title="Failed to load contract"
            message={error?.message || "Contract not found"}
            onRetry={() => refetch()}
          />
        </View>
      </FlowScreen>
    );
  }

  const freelancer = contract.freelancer;
  const gig = contract.gig;
  const freelancerName = freelancer?.full_name || freelancer?.handle || "Freelancer";
  const freelancerAvatar = freelancer?.avatar_url;

  // Derive contract value from gig budget
  const contractValue = gig?.budget_max
    ? formatAmount(gig.budget_max)
    : gig?.budget_min
      ? formatAmount(gig.budget_min)
      : "—";

  const statusColor =
    contract.status === "active" ? "#34C759" :
    contract.status === "completed" ? "#007AFF" :
    contract.status === "cancelled" ? "#FF3B30" :
    palette.subText;

  const statusLabel = contract.status.charAt(0).toUpperCase() + contract.status.slice(1);

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync(contract.id);
    } catch (err) {
      console.error("Failed to mark contract complete:", err);
    }
  };

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(contract.id);
    } catch (err) {
      console.error("Failed to approve contract:", err);
    }
  };

  return (
    <FlowScreen>
      <FlowTopBar title="Contract Details" onLeftPress={nav.back} right="document-text-outline" onRightPress={() => {}} />

      {/* Freelancer Card */}
      <SurfaceCard style={styles.freelancerCard}>
        <View style={styles.freelancerRow}>
          <Avatar source={freelancerAvatar ? { uri: freelancerAvatar } : undefined} size={54} />
          <View style={{ flex: 1 }}>
            <T weight="bold" color={palette.text} style={styles.name}>{freelancerName}</T>
            <T weight="medium" color={palette.subText} style={styles.role}>
              {freelancer?.bio ? freelancer.bio.substring(0, 40) : "Freelancer"}
            </T>
            <View style={styles.stars}>
              <View style={[styles.statusChip, { backgroundColor: statusColor + "1A" }]}>
                <T weight="semiBold" color={statusColor} style={styles.statusText}>
                  {statusLabel.toUpperCase()}
                </T>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => nav.push(`/freelancer-stack/freelancer-profile?id=${contract.freelancer_id}`)}>
            <T weight="semiBold" color={palette.accent} style={styles.view}>View</T>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      {/* KPIs */}
      <View style={styles.grid}>
        <SurfaceCard style={styles.kpi}>
          <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>CONTRACT VALUE</T>
          <T weight="bold" color={palette.text} style={styles.kpiValue}>{contractValue}</T>
        </SurfaceCard>
        <SurfaceCard style={styles.kpi}>
          <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>STARTED</T>
          <T weight="bold" color={palette.text} style={styles.kpiValue}>{formatDate(contract.started_at)}</T>
        </SurfaceCard>
      </View>

      {/* Project Summary */}
      <SurfaceCard style={styles.block}>
        <T weight="bold" color={palette.text} style={styles.blockTitle}>Project Summary</T>
        <T color={palette.subText} style={styles.blockBody}>
          {gig?.description || "No description available."}
        </T>
      </SurfaceCard>

      {/* Contract Progress */}
      <SurfaceCard style={styles.block}>
        <T weight="bold" color={palette.text} style={styles.blockTitle}>Progress</T>
        <View style={styles.milestoneRow}>
          <Ionicons name="checkmark-circle" size={16} color="#1D9A5B" />
          <T weight="medium" color={palette.subText} style={styles.milestoneText}>Contract created</T>
        </View>
        <View style={styles.milestoneRow}>
          <Ionicons
            name={contract.freelancer_marked_complete ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={contract.freelancer_marked_complete ? "#1D9A5B" : palette.subText}
          />
          <T weight="medium" color={palette.subText} style={styles.milestoneText}>
            Freelancer marked complete
          </T>
        </View>
        <View style={styles.milestoneRow}>
          <Ionicons
            name={contract.founder_approved ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={contract.founder_approved ? "#1D9A5B" : palette.subText}
          />
          <T weight="medium" color={palette.subText} style={styles.milestoneText}>
            Founder approved
          </T>
        </View>
      </SurfaceCard>

      {/* Actions */}
      <View style={styles.ctaWrap}>
        <PrimaryButton
          label="Open Chat"
          icon="chatbubble-ellipses-outline"
          onPress={() => nav.push(`/freelancer-stack/contract-chat-thread?contractId=${contract.id}&title=${encodeURIComponent(freelancerName + " • Contract Chat")}`)}
        />

        {contract.status === "active" && !contract.freelancer_marked_complete && (
          <PrimaryButton
            label="Mark as Complete"
            icon="checkmark-done-outline"
            onPress={handleComplete}
            loading={completeMutation.isPending}
            style={{ marginTop: 10 }}
          />
        )}

        {contract.status === "active" && contract.freelancer_marked_complete && !contract.founder_approved && (
          <PrimaryButton
            label="Approve & Complete"
            icon="shield-checkmark-outline"
            onPress={handleApprove}
            loading={approveMutation.isPending}
            style={{ marginTop: 10 }}
          />
        )}

        {contract.status === "completed" && (
          <PrimaryButton
            label="Leave a Review"
            icon="star-outline"
            onPress={() => nav.push(`/freelancer-stack/leave-review?contractId=${contract.id}&revieweeId=${contract.freelancer_id}`)}
            style={{ marginTop: 10 }}
          />
        )}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  freelancerCard: { marginHorizontal: 18, marginTop: 12, padding: 12 },
  freelancerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 18 },
  role: { fontSize: 13, marginTop: 2 },
  stars: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, letterSpacing: 0.5 },
  view: { fontSize: 13 },
  grid: { flexDirection: "row", gap: 8, marginHorizontal: 18, marginTop: 10 },
  kpi: { flex: 1, padding: 12 },
  kpiLabel: { fontSize: 10, letterSpacing: 0.7 },
  kpiValue: { fontSize: 20, marginTop: 4 },
  block: { marginHorizontal: 18, marginTop: 10, padding: 12 },
  blockTitle: { fontSize: 16 },
  blockBody: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  milestoneText: { fontSize: 13 },
  ctaWrap: { marginHorizontal: 18, marginTop: 16 },
});
