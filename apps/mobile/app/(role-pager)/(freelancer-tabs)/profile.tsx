import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { Avatar, FlowScreen, FlowTopBar, SurfaceCard, T, people, useFlowPalette } from "@/components/community/freelancerFlow/shared";

export default function TalentProfileScreen() {
  const { palette } = useFlowPalette();

  return (
    <FlowScreen>
      <FlowTopBar title="My Profile" showLeft={false} />
      <View style={styles.content}>
        <SurfaceCard style={styles.hero}>
          <View style={styles.head}>
            <Avatar source={people.alex} size={84} />
            <View style={{ flex: 1 }}>
              <T weight="bold" color={palette.text} style={styles.name}>Arjun Patel</T>
              <T weight="semiBold" color={palette.text} style={styles.role}>Senior UI Designer</T>
              <View style={styles.row}><Ionicons name="location-outline" size={14} color={palette.subText} /><T weight="medium" color={palette.subText} style={styles.meta}>Bengaluru, KA</T></View>
            </View>
          </View>
        </SurfaceCard>

        <View style={styles.grid}>
          <SurfaceCard style={styles.kpi}><T weight="semiBold" color={palette.subText} style={styles.kLabel}>RATING</T><T weight="bold" color={palette.text} style={styles.kValue}>4.9/5</T></SurfaceCard>
          <SurfaceCard style={styles.kpi}><T weight="semiBold" color={palette.subText} style={styles.kLabel}>COMPLETED</T><T weight="bold" color={palette.text} style={styles.kValue}>18 gigs</T></SurfaceCard>
        </View>

        <SurfaceCard style={styles.card}>
          <T weight="bold" color={palette.text} style={styles.title}>Skills</T>
          <View style={styles.tags}>{["UI Design", "Figma", "Design Systems", "Product UX"].map((tag) => <View key={tag} style={[styles.tag, { backgroundColor: palette.border }]}><T weight="medium" color={palette.text} style={styles.tagText}>{tag}</T></View>)}</View>
        </SurfaceCard>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  hero: { padding: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 20 },
  role: { fontSize: 14, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  meta: { fontSize: 12 },
  grid: { flexDirection: "row", gap: 8 },
  kpi: { flex: 1, padding: 12 },
  kLabel: { fontSize: 10, letterSpacing: 0.8 },
  kValue: { fontSize: 18, marginTop: 4 },
  card: { padding: 12 },
  title: { fontSize: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 12 },
});
