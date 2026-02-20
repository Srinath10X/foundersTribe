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
    meta: "Posted 2 days ago • $80-120/hr",
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
              <SurfaceCard key={m.label} style={styles.metricCard}>
                <T weight="semiBold" color={palette.subText} style={styles.metricLabel} numberOfLines={1}>
                  {m.label.toUpperCase()}
                </T>
                <T weight="bold" color={palette.text} style={styles.metricValue}>{m.value}</T>
              </SurfaceCard>
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
        <View style={styles.row}><Ionicons name="cash-outline" size={15} color={palette.subText} /><T weight="medium" color={palette.subText} style={styles.rowText}>Raised: $1.2M (Seed)</T></View>
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

      <T weight="bold" color={palette.text} style={[styles.sectionTitle, { marginHorizontal: 18, marginTop: 12 }]}>Recent Reviews</T>
      <View style={styles.listWrap}>
        {[{ n: "Sarah Jenkins", r: "Product Designer", d: people.female1, t: "Clear communicator, fast decisions, and organized collaboration." }, { n: "David Chen", r: "Full Stack Engineer", d: people.david, t: "Great product sense and very respectful founder to work with." }].map((r) => (
          <SurfaceCard key={r.n} style={styles.reviewCard}>
            <View style={styles.revTop}>
              <Avatar source={r.d} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="bold" color={palette.text} style={styles.revName}>{r.n}</T>
                <T weight="medium" color={palette.subText} style={styles.revRole}>{r.r}</T>
              </View>
              <T weight="bold" color={palette.warning} style={styles.star}>★★★★★</T>
            </View>
            <T color={palette.text} style={styles.revBody}>"{r.t}"</T>
          </SurfaceCard>
        ))}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: { marginHorizontal: 18, marginTop: 10, padding: 14 },
  headerWrap: { alignItems: "center" },
  avatarWrap: { position: "relative" },
  verify: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 24, marginTop: 8 },
  role: { fontSize: 14, marginTop: 2 },
  bio: { fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8, maxWidth: 330 },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },

  metricsGrid: { gap: 8, paddingHorizontal: 18, marginTop: 10 },
  metricRow: { flexDirection: "row", gap: 8 },
  metricCard: { flex: 1, minHeight: 78, justifyContent: "center", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8 },
  metricLabel: { fontSize: 10, letterSpacing: 0.7 },
  metricValue: { fontSize: 18, marginTop: 4 },

  card: { marginHorizontal: 18, marginTop: 10, padding: 12 },
  cardTitle: { fontSize: 16 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, rowGap: 10 },
  detailCell: { width: "50%", paddingRight: 8 },
  detailLabel: { fontSize: 11 },
  detailValue: { fontSize: 13, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  rowText: { fontSize: 13, flex: 1 },

  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingHorizontal: 18 },
  sectionTitle: { fontSize: 18 },
  link: { fontSize: 13 },

  listWrap: { paddingHorizontal: 18, marginTop: 8, gap: 8 },
  postCard: { padding: 12 },
  postTitle: { fontSize: 16, flexShrink: 1 },
  postMeta: { fontSize: 12, marginTop: 3 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  tagTxt: { fontSize: 11 },

  reviewCard: { padding: 12 },
  revTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  revName: { fontSize: 14 },
  revRole: { fontSize: 11 },
  star: { fontSize: 12 },
  revBody: { marginTop: 8, fontSize: 13, lineHeight: 18 },
});
