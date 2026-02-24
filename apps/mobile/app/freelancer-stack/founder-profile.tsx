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
import { StatCard } from "@/components/freelancer/StatCard";
import { SP, RADIUS } from "@/components/freelancer/designTokens";

const highlights = [
  { label: "Startup", value: "ShopHub" },
  { label: "Industry", value: "Commerce SaaS" },
  { label: "Stage", value: "Seed" },
  { label: "Team", value: "12 members" },
  { label: "HQ", value: "Austin, TX" },
  { label: "Since", value: "2021" },
];

const metrics = [
  { label: "Gigs Posted", value: "24" },
  { label: "Contracts", value: "8" },
  { label: "Hire Rate", value: "83%" },
  { label: "Avg Rating", value: "4.8" },
];
const metricRows = [
  [metrics[0], metrics[1]],
  [metrics[2], metrics[3]],
];

const postings = [
  {
    title: "Senior UI Designer",
    meta: "Posted 2 days ago • ₹80-120/hr",
    tags: ["Mobile", "Figma", "Fintech"],
  },
  {
    title: "React Developer",
    meta: "Posted 1 week ago • Project Based",
    tags: ["Node.js", "PostgreSQL"],
  },
];

export default function FounderProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Founder Profile" showLeft={false} />

      <SurfaceCard style={styles.heroCard}>
        <View style={styles.headerWrap}>
          <View style={styles.avatarWrap}>
            <Avatar source={people.marcus} size={88} />
            <View style={[styles.verify, { backgroundColor: palette.accent }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          </View>
          <T weight="bold" color={palette.text} style={styles.name}>Marcus Thorne</T>
          <T weight="semiBold" color={palette.text} style={styles.role}>Founder & CEO • ShopHub</T>
          <T weight="medium" color={palette.subText} style={styles.bio}>
            Building tools that help early-stage teams launch faster. Focused on fintech onboarding and growth UX.
          </T>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={palette.subText} />
              <T weight="medium" color={palette.subText} style={styles.metaText}>Austin, TX</T>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={palette.subText} />
              <T weight="medium" color={palette.subText} style={styles.metaText}>Replies in ~2h</T>
            </View>
          </View>
        </View>
      </SurfaceCard>

      <View style={styles.metricsGrid}>
        {metricRows.map((row, rowIdx) => (
          <View key={`row-${rowIdx}`} style={styles.metricRow}>
            {row.map((m) => (
              <StatCard key={m.label} label={m.label} value={m.value} />
            ))}
          </View>
        ))}
      </View>

      <SurfaceCard style={styles.card}>
        <T weight="bold" color={palette.text} style={styles.cardTitle}>Startup Details</T>
        <View style={styles.detailsGrid}>
          {highlights.map((h) => (
            <View key={h.label} style={styles.detailCell}>
              <T weight="semiBold" color={palette.subText} style={styles.detailLabel}>{h.label}</T>
              <T weight="semiBold" color={palette.text} style={styles.detailValue} numberOfLines={1}>{h.value}</T>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <T weight="bold" color={palette.text} style={styles.cardTitle}>Funding & Traction</T>
        <View style={styles.row}><Ionicons name="cash-outline" size={15} color={palette.subText} /><T weight="medium" color={palette.subText} style={styles.rowText}>Raised: ₹1.2M (Seed)</T></View>
        <View style={styles.row}><Ionicons name="people-outline" size={15} color={palette.subText} /><T weight="medium" color={palette.subText} style={styles.rowText}>12,000+ active users across client products</T></View>
        <View style={styles.row}><Ionicons name="rocket-outline" size={15} color={palette.subText} /><T weight="medium" color={palette.subText} style={styles.rowText}>Launching v2 onboarding automation this quarter</T></View>
      </SurfaceCard>

      <View style={styles.sectionHead}>
        <T weight="bold" color={palette.text} style={styles.sectionTitle}>Active Postings</T>
        <TouchableOpacity onPress={() => nav.push("/freelancer-stack/my-gigs")}>
          <T weight="bold" color={palette.accent} style={styles.link}>See All</T>
        </TouchableOpacity>
      </View>

      <View style={styles.listWrap}>
        {postings.map((p) => (
          <SurfaceCard key={p.title} style={styles.postCard}>
            <T weight="bold" color={palette.text} style={styles.postTitle}>{p.title}</T>
            <T weight="medium" color={palette.subText} style={styles.postMeta}>{p.meta}</T>
            <View style={styles.tags}>
              {p.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: palette.border }]}>
                  <T weight="medium" color={palette.subText} style={styles.tagTxt}>{tag}</T>
                </View>
              ))}
            </View>
          </SurfaceCard>
        ))}
      </View>

      <T weight="bold" color={palette.text} style={[styles.sectionTitle, { marginHorizontal: SP._20, marginTop: SP._20 }]}>Recent Reviews</T>
      <View style={styles.listWrap}>
        {[{ n: "Sarah Jenkins", r: "Product Designer", d: people.female1, t: "Clear communicator, fast decisions, and organized collaboration." }, { n: "David Chen", r: "Full Stack Engineer", d: people.david, t: "Great product sense and very respectful founder to work with." }].map((r) => (
          <SurfaceCard key={r.n} style={styles.reviewCard}>
            <View style={styles.revTop}>
              <Avatar source={r.d} size={40} />
              <View style={styles.revText}>
                <T weight="bold" color={palette.text} style={styles.revName}>{r.n}</T>
                <T weight="medium" color={palette.subText} style={styles.revRole}>{r.r}</T>
              </View>
              <View style={styles.ratingWrap}>
                <Ionicons name="star" size={14} color={palette.warning} />
                <T weight="bold" color={palette.text} style={styles.star}>5.0</T>
              </View>
            </View>
            <T color={palette.text} style={styles.revBody}>"{r.t}"</T>
          </SurfaceCard>
        ))}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: { marginHorizontal: SP._16, marginTop: SP._16, padding: SP._16 },
  headerWrap: { alignItems: "center" },
  avatarWrap: { position: "relative" },
  verify: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: { fontSize: 24, marginTop: SP._12, letterSpacing: -0.4 },
  role: { fontSize: 14, marginTop: SP._2 },
  bio: { fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: SP._12, maxWidth: 330 },
  metaRow: { flexDirection: "row", gap: SP._16, marginTop: SP._12, flexWrap: "wrap", justifyContent: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: SP._8 },
  metaText: { fontSize: 13 },

  metricsGrid: { gap: SP._16, paddingHorizontal: SP._16, marginTop: SP._16 },
  metricRow: { flexDirection: "row", gap: SP._16 },

  card: { marginHorizontal: SP._16, marginTop: SP._16, padding: SP._16 },
  cardTitle: { fontSize: 16, letterSpacing: -0.2 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: SP._16, rowGap: SP._16 },
  detailCell: { width: "50%", paddingRight: SP._8 },
  detailLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  detailValue: { fontSize: 14, marginTop: SP._4 },
  row: { flexDirection: "row", alignItems: "center", gap: SP._8, marginTop: SP._12 },
  rowText: { fontSize: 14, flex: 1, lineHeight: 20 },

  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SP._24, paddingHorizontal: SP._16 },
  sectionTitle: { fontSize: 18, letterSpacing: -0.2 },
  link: { fontSize: 14 },

  listWrap: { paddingHorizontal: SP._16, marginTop: SP._12, gap: SP._12 },
  postCard: { padding: SP._16, borderRadius: RADIUS.lg },
  postTitle: { fontSize: 15, flexShrink: 1, letterSpacing: -0.2 },
  postMeta: { fontSize: 13, marginTop: SP._4 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: SP._8, marginTop: SP._12 },
  tag: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5 },
  tagTxt: { fontSize: 11 },

  reviewCard: { padding: SP._16 },
  revTop: { flexDirection: "row", alignItems: "center", gap: SP._12 },
  revText: { flex: 1, minWidth: 0 },
  revName: { fontSize: 14 },
  revRole: { fontSize: 12, marginTop: 2 },
  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  star: { fontSize: 14 },
  revBody: { marginTop: SP._12, fontSize: 14, lineHeight: 22, fontStyle: "italic" },
});
