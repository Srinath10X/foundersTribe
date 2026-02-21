import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  Badge,
  FlowScreen,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

const gigs = [
  {
    title: "Senior UI Designer",
    status: "Hiring",
    tone: "success" as const,
    metaLeft: "12 Applications",
    metaRight: "Posted 2d ago",
    cta: "View Proposals",
    route: "/freelancer-stack/gig-proposals",
    kind: "avatars",
  },
  {
    title: "React Developer",
    status: "In Progress",
    tone: "progress" as const,
    metaLeft: "Working with Sarah C.",
    metaRight: "Started Oct 12",
    cta: "Manage Contract",
    route: "/freelancer-stack/contract-details",
    kind: "milestone",
  },
  {
    title: "Logo Design Project",
    status: "Completed",
    tone: "neutral" as const,
    metaLeft: "48 Applications",
    metaRight: "Ended Oct 05",
    cta: "Review Details",
    route: "/freelancer-stack/gig-details",
    kind: "completed",
  },
];

export default function MyGigsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <View style={[styles.header, { borderBottomColor: palette.border }]}> 
        <View>
          <T weight="semiBold" color={palette.subText} style={styles.smallLabel}>Your Workspace</T>
          <T weight="bold" color={palette.text} style={styles.title}>My Gigs</T>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => nav.push("/freelancer-stack/post-gig")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color={palette.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.summaryRow}>
          <SurfaceCard style={styles.summaryCard}>
            <T weight="semiBold" color={palette.subText} style={styles.summaryLabel}>ACTIVE</T>
            <T weight="bold" color={palette.text} style={styles.summaryValue}>2</T>
          </SurfaceCard>
          <SurfaceCard style={styles.summaryCard}>
            <T weight="semiBold" color={palette.subText} style={styles.summaryLabel}>COMPLETED</T>
            <T weight="bold" color={palette.text} style={styles.summaryValue}>18</T>
          </SurfaceCard>
          <SurfaceCard style={styles.summaryCard}>
            <T weight="semiBold" color={palette.subText} style={styles.summaryLabel}>PENDING</T>
            <T weight="bold" color={palette.text} style={styles.summaryValue}>1</T>
          </SurfaceCard>
        </View>

        {gigs.map((gig) => (
          <SurfaceCard key={gig.title} style={styles.card}>
            <View style={styles.cardHead}>
              <T
                weight="bold"
                color={palette.text}
                style={styles.cardTitle}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {gig.title}
              </T>
              <Badge label={gig.status} tone={gig.tone} />
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons
                  name={gig.kind === "milestone" ? "person" : gig.kind === "completed" ? "checkmark-circle" : "people"}
                  size={15}
                  color={palette.subText}
                />
                <T
                  weight="medium"
                  color={palette.subText}
                  style={styles.metaText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {gig.metaLeft}
                </T>
              </View>

              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={15} color={palette.subText} />
                <T
                  weight="medium"
                  color={palette.subText}
                  style={styles.metaText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {gig.metaRight}
                </T>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            <View style={styles.cardBottom}>
              {gig.kind === "avatars" ? (
                <View style={styles.avatars}>
                  {[people.alex, people.jordan, people.sarah].map((p, idx) => (
                    <View key={`${p}-${idx}`} style={{ marginLeft: idx === 0 ? 0 : -8 }}>
                      <Avatar source={p} size={26} />
                    </View>
                  ))}
                  <View style={[styles.more, { backgroundColor: palette.border }]}> 
                    <T weight="semiBold" color={palette.subText} style={{ fontSize: 11 }}>+9</T>
                  </View>
                </View>
              ) : gig.kind === "milestone" ? (
                <View style={styles.milestone}> 
                  <View style={[styles.dot, { backgroundColor: "#77A6FF" }]} />
                  <T weight="medium" color={palette.subText} style={styles.metaText}>Milestone 2 of 4</T>
                </View>
              ) : (
                <View style={styles.milestone}> 
                  <Ionicons name="archive-outline" size={14} color={palette.subText} />
                  <T
                    weight="medium"
                    color={palette.subText}
                    style={styles.metaText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Archived Candidate List
                  </T>
                </View>
              )}

              <TouchableOpacity onPress={() => nav.push(gig.route)} activeOpacity={0.8}>
                <View style={styles.ctaRow}>
                  <T
                    weight="bold"
                    color={palette.accent}
                    style={styles.actionText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {gig.cta}
                  </T>
                  <Ionicons name="chevron-forward" size={16} color={palette.accent} />
                </View>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        ))}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  smallLabel: { fontSize: 11, letterSpacing: 0.8 },
  title: { fontSize: 26 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { paddingHorizontal: 18, paddingTop: 14, gap: 12 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: { flex: 1, paddingVertical: 10, alignItems: "center" },
  summaryLabel: { fontSize: 10, letterSpacing: 0.8 },
  summaryValue: { fontSize: 18, marginTop: 4 },
  card: { padding: 12 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 },
  cardTitle: { fontSize: 18, flex: 1, flexShrink: 1, paddingRight: 2 },
  metaRow: { gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 7, minWidth: 0 },
  metaText: { fontSize: 13, flexShrink: 1 },
  divider: { height: 1, marginVertical: 10 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  avatars: { flexDirection: "row", alignItems: "center" },
  more: { width: 26, height: 26, borderRadius: 13, marginLeft: -8, justifyContent: "center", alignItems: "center" },
  milestone: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 2, maxWidth: 150 },
  actionText: { fontSize: 13, flexShrink: 1 },
});
