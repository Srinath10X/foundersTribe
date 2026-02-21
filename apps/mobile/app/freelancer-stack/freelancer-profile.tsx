import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

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

const skills = ["React Native", "Node.js", "PostgreSQL", "WebSockets", "TypeScript"];
const outcomes = [
  "Launched 14 production apps",
  "Reduced API latency by 35%",
  "Improved retention by 22%",
];

export default function FreelancerProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Freelancer Profile" onLeftPress={nav.back} right="ellipsis-horizontal" onRightPress={() => {}} />

      <View style={styles.page}>
        <SurfaceCard style={styles.heroCard}>
          <View style={styles.head}>
            <View style={styles.avatarWrap}>
              <Avatar source={people.alex} size={92} />
              <View style={[styles.online, { borderColor: palette.bg }]} />
            </View>
            <View style={styles.headText}>
              <T weight="bold" color={palette.text} style={styles.name}>Alex Rivers</T>
              <T weight="semiBold" color={palette.accent} style={styles.role}>Senior Full Stack Developer</T>
              <View style={styles.location}><Ionicons name="location" size={14} color={palette.subText} /><T weight="medium" color={palette.subText} style={styles.locationText}>Bengaluru, KA</T></View>
            </View>
          </View>

        </SurfaceCard>

        <View style={styles.stats}>
          <SurfaceCard style={styles.statCard}>
            <T weight="semiBold" color={palette.subText} style={styles.statLabel}>RATING</T>
            <T weight="bold" color={palette.text} style={styles.statValue}>4.9 / 5</T>
            <T weight="medium" color={palette.subText} style={styles.statSub}>48 completed gigs</T>
          </SurfaceCard>
          <SurfaceCard style={styles.statCard}>
            <T weight="semiBold" color={palette.subText} style={styles.statLabel}>HOURLY RATE</T>
            <T weight="bold" color={palette.text} style={styles.statValue}>₹85/hr</T>
            <T weight="medium" color={palette.subText} style={styles.statSub}>Available this week</T>
          </SurfaceCard>
        </View>

        <SurfaceCard style={styles.card}>
          <T weight="bold" color={palette.text} style={styles.cardTitle}>Top Skills</T>
          <View style={styles.tags}>
            {skills.map((skill) => (
              <View key={skill} style={[styles.tag, { backgroundColor: palette.border }]}>
                <T weight="semiBold" color={palette.subText} style={styles.tagText}>{skill}</T>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <T weight="bold" color={palette.text} style={styles.cardTitle}>Recent Outcomes</T>
          {outcomes.map((item) => (
            <View key={item} style={styles.row}>
              <Ionicons name="checkmark-circle" size={16} color={palette.accent} />
              <T weight="medium" color={palette.subText} style={styles.rowText}>{item}</T>
            </View>
          ))}
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <View style={styles.reviewHead}>
            <T weight="bold" color={palette.text} style={styles.cardTitle}>Client Review</T>
            <T weight="bold" color={palette.accent} style={styles.stars}>★★★★★</T>
          </View>
          <T color={palette.text} style={styles.reviewText}>
            "Alex delivered exceptional architecture and clean implementation. Communication was consistent and execution was fast."
          </T>
          <View style={styles.clientRow}>
            <Avatar source={people.marcus} size={28} />
            <T weight="medium" color={palette.subText} style={styles.clientName}>Marcus Thorne, Founder at ShopHub</T>
          </View>
        </SurfaceCard>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  heroCard: { padding: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: { position: "relative" },
  online: {
    position: "absolute",
    right: 1,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#5FA876",
    borderWidth: 2,
  },
  headText: { flex: 1 },
  name: { fontSize: 20 },
  role: { fontSize: 14, marginTop: 1 },
  location: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 12 },

  stats: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, padding: 12 },
  statLabel: { fontSize: 10, letterSpacing: 0.8 },
  statValue: { fontSize: 17, marginTop: 3 },
  statSub: { fontSize: 11, marginTop: 2 },

  card: { padding: 12 },
  cardTitle: { fontSize: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  tagText: { fontSize: 11 },

  row: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  rowText: { fontSize: 13, flex: 1 },

  reviewHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stars: { fontSize: 12 },
  reviewText: { marginTop: 8, fontSize: 13, lineHeight: 19 },
  clientRow: { marginTop: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  clientName: { fontSize: 12 },
});
