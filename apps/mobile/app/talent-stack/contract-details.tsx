import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { Avatar, FlowScreen, FlowTopBar, PrimaryButton, SurfaceCard, T, people, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

export default function TalentContractDetails() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Contract Details" onLeftPress={nav.back} />
      <View style={styles.content}>
        <SurfaceCard style={styles.card}>
          <View style={styles.row}>
            <Avatar source={people.alex} size={44} />
            <View style={{ flex: 1 }}>
              <T weight="bold" color={palette.text} style={styles.title}>SaaS Platform Redesign</T>
              <T weight="medium" color={palette.subText} style={styles.meta}>Founder: Alex Rivers</T>
            </View>
          </View>
        </SurfaceCard>

        <View style={styles.kpiRow}>
          <SurfaceCard style={styles.kpi}><T weight="semiBold" color={palette.subText} style={styles.kLabel}>VALUE</T><T weight="bold" color={palette.text} style={styles.kValue}>$2,500</T></SurfaceCard>
          <SurfaceCard style={styles.kpi}><T weight="semiBold" color={palette.subText} style={styles.kLabel}>DEADLINE</T><T weight="bold" color={palette.text} style={styles.kValue}>Oct 30</T></SurfaceCard>
        </View>

        <SurfaceCard style={styles.card}>
          <T weight="bold" color={palette.text} style={styles.title}>Milestones</T>
          {[
            "Wireframes completed",
            "UI revision in progress",
            "Final delivery and handoff",
          ].map((m, i) => (
            <View key={m} style={styles.mRow}>
              <Ionicons name={i < 1 ? "checkmark-circle" : "ellipse-outline"} size={16} color={i < 1 ? palette.success : palette.subText} />
              <T weight="medium" color={palette.subText} style={styles.meta}>{m}</T>
            </View>
          ))}
        </SurfaceCard>

        <PrimaryButton label="Open Chat" icon="chatbubble-ellipses" onPress={() => nav.push("/talent-stack/chat-thread")} />
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  card: { padding: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 17 },
  meta: { fontSize: 13, marginTop: 2 },
  kpiRow: { flexDirection: "row", gap: 8 },
  kpi: { flex: 1, padding: 12 },
  kLabel: { fontSize: 10, letterSpacing: 0.8 },
  kValue: { fontSize: 20, marginTop: 4 },
  mRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
});
