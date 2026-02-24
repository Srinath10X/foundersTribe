import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { useContract } from "@/hooks/useGig";

function formatStatus(status?: string) {
  if (!status) return "Active Contract";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FreelancerContractDetailsScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams<{ id?: string }>();

  const contractId = typeof params.id === "string" ? params.id : "";
  const { data: contract } = useContract(contractId, !!contractId);

  const title = contract?.gig?.title || "Contract Job";
  const client = contract?.founder?.full_name || "Founder";
  const progress = contract?.founder_approved
    ? 100
    : contract?.freelancer_marked_complete
      ? 85
      : contract?.status === "active"
        ? 55
        : 35;

  const budgetText = contract?.gig
    ? `₹${Number(contract.gig.budget_min || 0).toLocaleString()} - ₹${Number(contract.gig.budget_max || 0).toLocaleString()}`
    : "-";

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={17} color={palette.text} />
        </TouchableOpacity>

        <T weight="medium" color={palette.text} style={styles.headerTitle} numberOfLines={1}>
          Contract Details
        </T>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <LinearGradient
            colors={[palette.accentSoft, palette.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: palette.borderLight }]}
          >
            <View style={styles.heroTop}>
              <View style={[styles.heroPill, { backgroundColor: palette.accentSoft }]}> 
                <T weight="medium" color={palette.accent} style={styles.heroPillText}>
                  {formatStatus(contract?.status)}
                </T>
              </View>
              <View style={[styles.heroPill, { backgroundColor: palette.borderLight }]}> 
                <T weight="regular" color={palette.subText} style={styles.heroPillText}>
                  ID {contractId || "N/A"}
                </T>
              </View>
            </View>

            <T weight="medium" color={palette.text} style={styles.heroTitle} numberOfLines={2}>
              {title}
            </T>

            <View style={styles.ownerRow}>
              <Avatar source={contract?.founder?.avatar_url || undefined} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.ownerName} numberOfLines={1}>
                  {client}
                </T>
                <T weight="regular" color={palette.subText} style={styles.ownerMeta} numberOfLines={1}>
                  Started {contract?.started_at ? new Date(contract.started_at).toLocaleDateString() : "-"}
                </T>
              </View>
            </View>

            <View style={styles.progressHead}>
              <T weight="regular" color={palette.subText} style={styles.progressLabel}>
                Completion
              </T>
              <T weight="semiBold" color={palette.text} style={styles.progressValue}>
                {progress}%
              </T>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: palette.borderLight }]}> 
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: palette.accent }]} />
            </View>
          </LinearGradient>

          <View style={styles.snapshotRow}>
            <SurfaceCard style={styles.snapshotCard}>
              <T weight="medium" color={palette.subText} style={styles.snapshotLabel}>
                Contract Value
              </T>
              <T weight="semiBold" color={palette.text} style={styles.snapshotValue}>
                {budgetText}
              </T>
            </SurfaceCard>

            <SurfaceCard style={styles.snapshotCard}>
              <T weight="medium" color={palette.subText} style={styles.snapshotLabel}>
                Status
              </T>
              <T weight="semiBold" color={palette.text} style={styles.snapshotValue}>
                {formatStatus(contract?.status)}
              </T>
            </SurfaceCard>
          </View>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Project Overview
            </T>
            <T weight="regular" color={palette.subText} style={styles.sectionBody}>
              {contract?.gig?.description || "No project overview available."}
            </T>
          </SurfaceCard>

          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.primaryBtn, { backgroundColor: palette.accent }]}
              onPress={() =>
                router.push(
                  `/(role-pager)/(freelancer-tabs)/thread/${encodeURIComponent(contractId)}?title=${encodeURIComponent(client)}&avatar=${encodeURIComponent(contract?.founder?.avatar_url || "")}` as any,
                )
              }
            >
              <T weight="medium" color="#fff" style={styles.primaryBtnText}>
                Open Chat
              </T>
            </TouchableOpacity>
          </View>
          <View style={{ height: tabBarHeight + 18 }} />
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
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 10,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroPillText: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: "capitalize",
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  ownerRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  ownerName: {
    fontSize: 13,
    lineHeight: 17,
  },
  ownerMeta: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  progressHead: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  progressValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  progressTrack: {
    marginTop: 6,
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 7,
    borderRadius: 999,
  },
  snapshotRow: {
    flexDirection: "row",
    gap: 8,
  },
  snapshotCard: {
    flex: 1,
    padding: 13,
    borderRadius: 12,
  },
  snapshotLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  snapshotValue: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  card: {
    padding: 14,
    borderRadius: 14,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  sectionBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    marginTop: 2,
  },
  primaryBtn: {
    borderRadius: 12,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
});
