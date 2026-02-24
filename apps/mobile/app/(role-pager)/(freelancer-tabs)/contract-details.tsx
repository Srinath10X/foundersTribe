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
  people,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

export default function FreelancerContractDetailsScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    client?: string;
    due?: string;
    progress?: string;
  }>();

  const title = typeof params.title === "string" && params.title.trim() ? params.title : "Contract Job";
  const client = typeof params.client === "string" && params.client.trim() ? params.client : "Founder";
  const due = typeof params.due === "string" && params.due.trim() ? params.due : "in 5 days";
  const progressRaw = typeof params.progress === "string" ? Number(params.progress) : 50;
  const progress = Number.isFinite(progressRaw) ? Math.max(0, Math.min(100, Math.round(progressRaw))) : 50;
  const contractId = typeof params.id === "string" && params.id.trim() ? params.id : "N/A";
  const threadIdMap: Record<string, string> = {
    "gig-1": "m1",
    "gig-2": "m2",
    "gig-3": "m3",
    "gig-4": "m4",
  };
  const threadId = threadIdMap[contractId] || contractId;

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
                  Active Contract
                </T>
              </View>
              <View style={[styles.heroPill, { backgroundColor: palette.borderLight }]}> 
                <T weight="regular" color={palette.subText} style={styles.heroPillText}>
                  ID {contractId}
                </T>
              </View>
            </View>

            <T weight="medium" color={palette.text} style={styles.heroTitle} numberOfLines={2}>
              {title}
            </T>

            <View style={styles.ownerRow}>
              <Avatar source={people.alex} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.ownerName} numberOfLines={1}>
                  {client}
                </T>
                <T weight="regular" color={palette.subText} style={styles.ownerMeta} numberOfLines={1}>
                  Deadline {due}
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
                ₹25,000
              </T>
            </SurfaceCard>

            <SurfaceCard style={styles.snapshotCard}>
              <T weight="medium" color={palette.subText} style={styles.snapshotLabel}>
                Remaining
              </T>
              <T weight="semiBold" color={palette.text} style={styles.snapshotValue}>
                ₹15,000
              </T>
            </SurfaceCard>
          </View>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Project Overview
            </T>
            <T weight="regular" color={palette.subText} style={styles.sectionBody}>
              This contract covers end-to-end delivery of the agreed work scope with weekly progress updates, milestone
              validation, and final handoff documentation.
            </T>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Deliverables
            </T>

            {[
              "Responsive implementation for agreed screens",
              "Weekly progress update with blocker tracking",
              "Final delivery package and handoff notes",
            ].map((item) => (
              <View key={item} style={styles.scopeRow}>
                <View style={[styles.scopeDot, { backgroundColor: palette.accent }]} />
                <T weight="regular" color={palette.subText} style={styles.scopeText}>
                  {item}
                </T>
              </View>
            ))}
          </SurfaceCard>

          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.primaryBtn, { backgroundColor: palette.accent }]}
              onPress={() =>
                router.push(
                  `/(role-pager)/(freelancer-tabs)/thread/${encodeURIComponent(threadId)}` as any,
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
    fontSize: 16,
    lineHeight: 21,
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
  timelineWrap: {
    marginTop: 10,
    gap: 2,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  timelineRail: {
    width: 18,
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    height: 30,
    marginTop: 2,
    borderRadius: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 10,
  },
  milestoneTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  milestoneNote: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  scopeRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  scopeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  scopeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ghostBtn: {
    width: 108,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  ghostBtnText: {
    fontSize: 13,
    lineHeight: 17,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 14,
    lineHeight: 18,
  },
});
