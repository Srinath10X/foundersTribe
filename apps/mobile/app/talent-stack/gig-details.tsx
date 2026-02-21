import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Avatar, Badge, FlowScreen, FlowTopBar, PrimaryButton, SurfaceCard, T, people, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

export default function TalentGigDetailsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Gig Details" onLeftPress={nav.back} right="heart-outline" onRightPress={() => {}} />

      <View style={styles.content}>
        <View style={styles.badges}><Badge label="High Priority" tone="danger" /><Badge label="Verified Founder" tone="progress" /></View>
        <T weight="bold" color={palette.text} style={styles.title}>Senior iOS Developer for FinTech MVP</T>

        <SurfaceCard style={styles.founderCard}>
          <Avatar source={people.alex} size={42} />
          <View style={{ flex: 1 }}>
            <T weight="bold" color={palette.text} style={styles.name}>Alex Rivers</T>
            <View style={styles.rateRow}>
              <Ionicons name="star" size={13} color={palette.warning} />
              <T weight="semiBold" color={palette.subText} style={styles.meta}>4.9 (12 reviews)</T>
            </View>
          </View>
          <T weight="medium" color={palette.subText} style={styles.meta}>Mumbai, MH</T>
        </SurfaceCard>

        <View style={styles.kpiRow}>
          {[
            { l: "Budget", v: "₹5,000", i: "wallet-outline" as const },
            { l: "Timeline", v: "3 Mos", i: "time-outline" as const },
            { l: "Level", v: "Expert", i: "ribbon-outline" as const },
          ].map((x) => (
            <SurfaceCard key={x.l} style={styles.kpiCard}>
              <Ionicons name={x.i} size={16} color={palette.accent} />
              <T weight="semiBold" color={palette.subText} style={styles.kLabel}>{x.l}</T>
              <T weight="bold" color={palette.text} style={styles.kValue}>{x.v}</T>
            </SurfaceCard>
          ))}
        </View>

        <SurfaceCard style={styles.block}>
          <T weight="bold" color={palette.text} style={styles.head}>Project Description</T>
          <T color={palette.subText} style={styles.body}>
            We are looking for a highly skilled iOS developer to lead the development of our fintech MVP including secure payment integrations and transaction dashboard screens.
          </T>
        </SurfaceCard>

        <SurfaceCard style={styles.block}>
          <T weight="bold" color={palette.text} style={styles.head}>Required Skills</T>
          <View style={styles.tags}>
            {["SwiftUI", "Combine", "Core Data", "REST API", "FinTech"].map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: palette.border }]}>
                <T weight="medium" color={palette.text} style={styles.tagText}>{tag}</T>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <PrimaryButton label="Send Proposal" icon="send" onPress={() => nav.push("/talent-stack/send-proposal")} />

        <TouchableOpacity style={styles.ghost} onPress={() => nav.push("/talent-stack/leave-review")}> 
          <T weight="semiBold" color={palette.subText} style={styles.meta}>Leave Founder Review</T>
        </TouchableOpacity>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  badges: { flexDirection: "row", gap: 8 },
  title: { fontSize: 30, lineHeight: 36 },
  founderCard: { padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 16 },
  rateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  meta: { fontSize: 12 },
  kpiRow: { flexDirection: "row", gap: 8 },
  kpiCard: { flex: 1, padding: 10, alignItems: "center" },
  kLabel: { fontSize: 11, marginTop: 4 },
  kValue: { fontSize: 16, marginTop: 2 },
  block: { padding: 12 },
  head: { fontSize: 18 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 12 },
  ghost: { alignItems: "center", marginTop: 4, marginBottom: 8 },
});
