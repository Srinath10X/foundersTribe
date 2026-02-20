import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

const proposals = [
  { name: "Alex Rivera", rating: "4.9", price: "$1,200", timeline: "14 days", image: people.alex, blurb: "Built fintech dashboards for 6+ startups." },
  { name: "Sarah Chen", rating: "5.0", price: "$1,550", timeline: "10 days", image: people.sarah, blurb: "Senior product designer focused on conversion UX." },
  { name: "Jordan Smith", rating: "4.7", price: "$950", timeline: "21 days", image: people.jordan, blurb: "Affordable, fast design delivery with clean visuals." },
];

export default function GigProposalsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Senior UI Designer" onLeftPress={nav.back} right="options" onRightPress={() => {}} />

      <View style={[styles.headCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View>
          <T weight="semiBold" color={palette.subText} style={styles.label}>PROJECT PROPOSALS</T>
          <T weight="bold" color={palette.text} style={styles.title}>12 Received</T>
        </View>
        <View style={[styles.bestTag, { backgroundColor: palette.accentSoft }]}>
          <T weight="semiBold" color={palette.accent} style={styles.bestText}>BEST MATCHES</T>
        </View>
      </View>

      <View style={styles.listWrap}>
        {proposals.map((p) => (
          <SurfaceCard key={p.name} style={styles.card}>
            <View style={styles.personRow}>
              <Avatar source={p.image} size={46} />
              <View style={{ flex: 1 }}>
                <T weight="bold" color={palette.text} style={styles.name}>{p.name}</T>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F4C430" />
                  <T weight="semiBold" color={palette.text} style={styles.rating}>{p.rating}</T>
                  <T weight="medium" color={palette.subText} style={styles.muted}>top rated</T>
                </View>
              </View>
            </View>

            <View style={styles.kpiRow}>
              <View style={[styles.kpi, { backgroundColor: palette.surface }]}> 
                <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>PRICE</T>
                <T weight="bold" color={palette.text} style={styles.kpiValue}>{p.price}</T>
              </View>
              <View style={[styles.kpi, { backgroundColor: palette.surface }]}> 
                <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>TIMELINE</T>
                <T weight="bold" color={palette.text} style={styles.kpiValue}>{p.timeline}</T>
              </View>
            </View>

            <T color={palette.subText} style={styles.blurb}>{p.blurb}</T>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.secondary, { backgroundColor: palette.surface }]} onPress={() => nav.push("/freelancer-stack/freelancer-profile")}> 
                <T weight="semiBold" color={palette.text} style={styles.btnText}>View Profile</T>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primary, { backgroundColor: palette.accent }]} onPress={() => nav.push("/freelancer-stack/contract-details")}>
                <T weight="bold" color="#fff" style={styles.btnText}>Accept</T>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        ))}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  headCard: {
    marginHorizontal: 18,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 11, letterSpacing: 0.8 },
  title: { fontSize: 22, marginTop: 2 },
  bestTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  bestText: { fontSize: 10, letterSpacing: 0.6 },
  listWrap: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  card: { padding: 12 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 18 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  rating: { fontSize: 13 },
  muted: { fontSize: 12 },
  kpiRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  kpi: { flex: 1, borderRadius: 10, padding: 10 },
  kpiLabel: { fontSize: 10, letterSpacing: 0.7 },
  kpiValue: { fontSize: 18, marginTop: 3 },
  blurb: { fontSize: 13, marginTop: 9, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  secondary: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  primary: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnText: { fontSize: 14 },
});
