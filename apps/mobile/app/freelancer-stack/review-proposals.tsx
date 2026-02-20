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
  {
    name: "Alex Rivera",
    rating: "4.9",
    reviews: "128 reviews",
    price: "$1,200",
    timeline: "14 days",
    description: "I have extensive experience in fintech UI design and can start immediately on your project.",
    image: people.alex,
  },
  {
    name: "Sarah Chen",
    rating: "5.0",
    reviews: "84 reviews",
    price: "$1,550",
    timeline: "10 days",
    description: "Senior Product Designer with a background in Neo-banking. I can deliver a full prototype.",
    image: people.sarah,
  },
  {
    name: "Jordan Smith",
    rating: "4.7",
    reviews: "42 reviews",
    price: "$950",
    timeline: "21 days",
    description: "Budget-friendly option without compromising quality. I specialize in minimal clean designs.",
    image: people.jordan,
  },
];

export default function ReviewProposalsScreen() {
  const { palette, isDark } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Review Proposals" onLeftPress={nav.back} right="ellipsis-horizontal" onRightPress={() => {}} />

      <View style={[styles.top, { borderBottomColor: palette.border }]}> 
        <T weight="semiBold" color={palette.subText} style={styles.projectLabel}>PROJECT</T>
        <T weight="bold" color={palette.accent} style={styles.projectTitle}>UI/UX Designer for Fintech App</T>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity style={[styles.sortBtn, { backgroundColor: palette.card }]}>
          <T weight="semiBold" color={palette.text} style={{ fontSize: 15 }}>Sort by: Lowest Price</T>
          <Ionicons name="chevron-down" size={16} color={palette.subText} />
        </TouchableOpacity>
        <T weight="medium" color={palette.subText} style={{ fontSize: 13 }}>12 Proposals</T>
      </View>

      <View style={styles.list}>
        {proposals.map((p) => (
          <SurfaceCard key={p.name} style={[styles.card, isDark ? null : { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }]}> 
            <View style={styles.personRow}>
              <Avatar source={p.image} size={50} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="bold" color={palette.text} style={{ fontSize: 18 }} numberOfLines={1}>
                  {p.name}
                </T>
                <View style={styles.rating}>
                  <Ionicons name="star" size={14} color="#F4C430" />
                  <T weight="semiBold" color={palette.text} style={{ fontSize: 14 }}>{p.rating}</T>
                  <T weight="medium" color={palette.subText} style={{ fontSize: 13 }} numberOfLines={1}>
                    ({p.reviews})
                  </T>
                </View>
              </View>
            </View>

            <View style={styles.kpis}>
              <View style={[styles.kpiItem, { backgroundColor: palette.surface }]}> 
                <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>PROPOSED PRICE</T>
                <T weight="bold" color={palette.text} style={styles.kpiValue}>{p.price}</T>
              </View>
              <View style={[styles.kpiItem, { backgroundColor: palette.surface }]}> 
                <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>TIMELINE</T>
                <T weight="bold" color={palette.text} style={styles.kpiValue}>{p.timeline}</T>
              </View>
            </View>

            <T color={palette.subText} style={styles.desc}>{p.description}</T>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.secondary, { backgroundColor: palette.surface }]}
                onPress={() => nav.push("/freelancer-stack/freelancer-profile")}
              >
                <T weight="bold" color={palette.text} style={styles.btnTxt}>View Profile</T>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primary, { backgroundColor: palette.accent }]}
                onPress={() => nav.push("/freelancer-stack/contract-chat")}
              >
                <T weight="bold" color="#fff" style={styles.btnTxt}>Accept</T>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        ))}
      </View>    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  projectLabel: { fontSize: 12, letterSpacing: 1.2 },
  projectTitle: { fontSize: 21, marginTop: 4, lineHeight: 28 },
  filters: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 16, gap: 12 },
  sortBtn: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  list: { paddingHorizontal: 20, paddingTop: 14, gap: 12 },
  card: { padding: 14 },
  personRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  rating: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  kpis: { flexDirection: "row", gap: 10, marginTop: 14 },
  kpiItem: { flex: 1, borderRadius: 12, padding: 11 },
  kpiLabel: { fontSize: 11, letterSpacing: 0.6 },
  kpiValue: { fontSize: 18, marginTop: 4 },
  desc: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondary: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primary: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnTxt: { fontSize: 15 },
});
