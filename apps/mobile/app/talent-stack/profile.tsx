import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { Avatar, FlowScreen, SurfaceCard, T, people, useFlowPalette } from "@/components/community/freelancerFlow/shared";

export default function TalentProfileScreen() {
  const { palette } = useFlowPalette();

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.surface }]}>
        <T weight="bold" color={palette.text} style={styles.pageTitle}>
          Profile
        </T>
      </View>

      <View style={styles.heroWrap}>
        <SurfaceCard style={styles.hero}>
          <View style={styles.heroDotOverlay} />
          <View style={styles.heroPatternA} />
          <View style={styles.heroPatternB} />
          <View style={styles.head}>
            <View style={styles.heroAvatarRing}>
              <Avatar source={people.alex} size={60} />
              <View style={styles.statusDot} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T weight="semiBold" color="#FFFFFF" style={styles.name}>
                Arjun Patel
              </T>
              <T weight="regular" color="rgba(255,255,255,0.82)" style={styles.role}>
                Senior UI Designer
              </T>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.76)" />
                <T weight="regular" color="rgba(255,255,255,0.76)" style={styles.meta}>
                  Bengaluru, KA
                </T>
              </View>
            </View>
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.content}>
        <View style={styles.grid}>
          <SurfaceCard style={styles.kpi}>
            <T weight="semiBold" color={palette.subText} style={styles.kLabel}>
              RATING
            </T>
            <T weight="bold" color={palette.text} style={styles.kValue}>
              4.9/5
            </T>
          </SurfaceCard>
          <SurfaceCard style={styles.kpi}>
            <T weight="semiBold" color={palette.subText} style={styles.kLabel}>
              COMPLETED
            </T>
            <T weight="bold" color={palette.text} style={styles.kValue}>
              18 gigs
            </T>
          </SurfaceCard>
        </View>

        <SurfaceCard style={styles.card}>
          <T weight="bold" color={palette.text} style={styles.title}>
            Skills
          </T>
          <View style={styles.tags}>
            {["UI Design", "Figma", "Design Systems", "Product UX"].map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: palette.border }]}>
                <T weight="medium" color={palette.text} style={styles.tagText}>
                  {tag}
                </T>
              </View>
            ))}
          </View>
        </SurfaceCard>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  heroWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  hero: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#121826",
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  heroDotOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  heroPatternA: {
    position: "absolute",
    right: -30,
    top: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(239, 68, 68, 0.28)",
  },
  heroPatternB: {
    position: "absolute",
    left: -60,
    bottom: -90,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59, 130, 246, 0.24)",
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroAvatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#121826",
  },
  name: { fontSize: 16, lineHeight: 20 },
  role: { fontSize: 12, lineHeight: 16, marginTop: 2 },
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
