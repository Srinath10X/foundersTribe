import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

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

const allProposals = [
  { name: "Arjun Patel", rating: "4.9", price: "₹1,200", timeline: "14 days", image: people.alex, blurb: "Built fintech dashboards for 6+ startups." },
  { name: "Priya Sharma", rating: "5.0", price: "₹1,550", timeline: "10 days", image: people.sarah, blurb: "Senior product designer focused on conversion UX." },
  { name: "Rahul Kumar", rating: "4.7", price: "₹950", timeline: "21 days", image: people.jordan, blurb: "Affordable, fast design delivery with clean visuals." },
  { name: "Ankit Singh", rating: "4.8", price: "₹1,800", timeline: "7 days", image: people.jordan, blurb: "Full-stack developer with React Native expertise." },
  { name: "Neha Gupta", rating: "4.6", price: "₹850", timeline: "28 days", image: people.sarah, blurb: "UI/UX designer specializing in mobile apps." },
];

export default function GigProposalsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const [searchQuery, setSearchQuery] = useState("");

  const proposals = allProposals.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.blurb.toLowerCase().includes(query) ||
      p.rating.includes(query)
    );
  });

  return (
    <FlowScreen>
      <FlowTopBar 
        title="Proposals" 
        onLeftPress={nav.back} 
        right="ellipsis-horizontal" 
        onRightPress={() => {}} 
      />

      {/* ─── Search Bar ─── */}
      <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Ionicons name="search" size={18} color={palette.subText} />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder="Search by name, skill, or rating..."
          placeholderTextColor={palette.subText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={palette.subText} />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Results Summary ─── */}
      <View style={[styles.summaryCard, { backgroundColor: palette.accentSoft }]}>
        <View style={styles.summaryContent}>
          <T weight="bold" color={palette.accent} style={styles.summaryCount}>
            {proposals.length}
          </T>
          <T weight="medium" color={palette.accent} style={styles.summaryLabel}>
            proposal{proposals.length !== 1 ? "s" : ""} found
          </T>
        </View>
        <View style={[styles.bestTag, { backgroundColor: palette.surface }]}>
          <T weight="bold" color={palette.accent} style={styles.bestText}>BEST MATCHES</T>
        </View>
      </View>

      <View style={styles.listWrap}>
        {proposals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={40} color={palette.subText} />
            <T weight="semiBold" color={palette.subText} style={styles.emptyText}>
              No proposals found
            </T>
            <T color={palette.subText} style={styles.emptySubtext}>
              Try adjusting your search
            </T>
          </View>
        ) : (
          proposals.map((p) => (
          <SurfaceCard key={p.name} style={styles.card}>
            <View style={styles.personRow}>
              <Avatar source={p.image} size={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="bold" color={palette.text} style={styles.name} numberOfLines={1}>
                  {p.name}
                </T>
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
        ))
        )}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 18,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  summaryCard: {
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryContent: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  summaryCount: {
    fontSize: 28,
  },
  summaryLabel: {
    fontSize: 14,
  },
  bestTag: { 
    borderRadius: 20, 
    paddingHorizontal: 14, 
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bestText: { fontSize: 11, letterSpacing: 0.5 },
  listWrap: { paddingHorizontal: 18, paddingTop: 16, gap: 12 },
  card: { padding: 16 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 18 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  rating: { fontSize: 14 },
  muted: { fontSize: 12 },
  kpiRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  kpi: { flex: 1, borderRadius: 12, padding: 12 },
  kpiLabel: { fontSize: 10, letterSpacing: 0.7 },
  kpiValue: { fontSize: 18, marginTop: 4 },
  blurb: { fontSize: 14, marginTop: 12, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondary: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primary: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnText: { fontSize: 14, letterSpacing: 0.3 },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 17,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});
