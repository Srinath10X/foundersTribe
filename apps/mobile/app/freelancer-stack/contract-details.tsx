import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  PrimaryButton,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

export default function ContractDetailsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Contract Details" onLeftPress={nav.back} right="document-text-outline" onRightPress={() => {}} />

      <SurfaceCard style={styles.freelancerCard}>
        <View style={styles.freelancerRow}>
          <Avatar source={people.sarah} size={54} />
          <View style={{ flex: 1 }}>
            <T weight="bold" color={palette.text} style={styles.name}>Priya Sharma</T>
            <T weight="medium" color={palette.subText} style={styles.role}>Senior React Developer</T>
            <View style={styles.stars}><Ionicons name="star" size={14} color="#F4C430" /><T weight="semiBold" color={palette.text} style={styles.rating}>5.0 • 84 reviews</T></View>
          </View>
          <TouchableOpacity onPress={() => nav.push("/freelancer-stack/freelancer-profile")}>
            <T weight="semiBold" color={palette.accent} style={styles.view}>View</T>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      <View style={styles.grid}>
        <SurfaceCard style={styles.kpi}><T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>CONTRACT VALUE</T><T weight="bold" color={palette.text} style={styles.kpiValue}>₹2,500</T></SurfaceCard>
        <SurfaceCard style={styles.kpi}><T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>DEADLINE</T><T weight="bold" color={palette.text} style={styles.kpiValue}>Oct 30</T></SurfaceCard>
      </View>

      <SurfaceCard style={styles.block}>
        <T weight="bold" color={palette.text} style={styles.blockTitle}>Project Summary</T>
        <T color={palette.subText} style={styles.blockBody}>Mobile onboarding redesign including 12 key screens, component system, and QA handoff.</T>
      </SurfaceCard>

      <SurfaceCard style={styles.block}>
        <T weight="bold" color={palette.text} style={styles.blockTitle}>Milestones</T>
        {["Wireframes delivered", "UI draft in review", "Final handoff pending"].map((m, i) => (
          <View key={m} style={styles.milestoneRow}>
            <Ionicons name={i < 2 ? "checkmark-circle" : "ellipse-outline"} size={16} color={i < 2 ? "#1D9A5B" : palette.subText} />
            <T weight="medium" color={palette.subText} style={styles.milestoneText}>{m}</T>
          </View>
        ))}
      </SurfaceCard>

      <View style={styles.ctaWrap}>
        <PrimaryButton label="Open Chat" icon="chatbubble-ellipses-outline" onPress={() => nav.push("/freelancer-stack/contract-chat-thread")} />
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
  rating: { fontSize: 12 },
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
