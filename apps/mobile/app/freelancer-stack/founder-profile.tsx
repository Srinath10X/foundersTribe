import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  PrimaryButton,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

export default function FounderProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar
        title="Founder Profile"
        left="arrow-back"
        right="settings"
        onLeftPress={nav.back}
      />

      <View style={styles.profileTop}>
        <View style={styles.avatarWrap}>
          <Avatar source={people.marcus} size={102} />
          <View style={[styles.verify, { backgroundColor: palette.accent }]}> 
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
          </View>
        </View>
        <T weight="bold" color={palette.text} style={styles.name}>Marcus Thorne</T>
        <T weight="semiBold" color={palette.accent} style={styles.role}>Founder & CEO at ShopHub</T>
        <View style={styles.loc}><Ionicons name="location" size={14} color={palette.subText} /><T weight="medium" color={palette.subText} style={{ fontSize: 17 / 1.2 }}>Austin, TX</T></View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Post a Gig" onPress={() => nav.push("/freelancer-stack/post-gig")} style={{ flex: 1 }} />
        <TouchableOpacity style={[styles.mailBtn, { backgroundColor: palette.accent }]}> 
          <Ionicons name="mail-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[{ l: "GIGS POSTED", v: "24" }, { l: "CONTRACTS", v: "8" }, { l: "AVG RATING", v: "4.8 ★" }].map((s) => (
          <View key={s.l} style={[styles.stat, { backgroundColor: palette.border }]}> 
            <T weight="semiBold" color={palette.subText} style={styles.statLabel}>{s.l}</T>
            <T weight="bold" color={palette.text} style={styles.statValue}>{s.v}</T>
          </View>
        ))}
      </View>

      <View style={styles.sectionHead}>
        <T weight="bold" color={palette.text} style={styles.sectionTitle}>Active Postings</T>
        <TouchableOpacity onPress={() => nav.push("/freelancer-stack/my-gigs")}> 
          <T weight="bold" color={palette.accent} style={{ fontSize: 16 }}>See All</T>
        </TouchableOpacity>
      </View>

      <View style={styles.pad}>
        <SurfaceCard style={styles.postCard}>
          <View style={styles.postHead}><T weight="bold" color={palette.text} style={styles.postTitle}>Senior UI Designer</T><T weight="bold" color={palette.accent} style={styles.hot}>HOT</T></View>
          <T weight="medium" color={palette.subText} style={styles.postMeta}>Posted 2 days ago • $80-120/hr</T>
          <T color={palette.subText} style={styles.postBody}>Looking for a UI expert to redesign our mobile checkout flow. Experience with high-conversion interfaces preferred.</T>
          <View style={styles.tags}>{["Mobile", "Figma"].map((t) => <View key={t} style={[styles.tag, { backgroundColor: palette.border }]}><T weight="medium" color={palette.subText} style={{ fontSize: 12 }}>{t}</T></View>)}</View>
        </SurfaceCard>

        <SurfaceCard style={styles.postCard}>
          <T weight="bold" color={palette.text} style={styles.postTitle}>React Developer</T>
          <T weight="medium" color={palette.subText} style={styles.postMeta}>Posted 1 week ago • Project Based</T>
          <T color={palette.subText} style={styles.postBody}>Node.js and PostgreSQL expert needed for scaling our API infrastructure ahead of seasonal launch.</T>
          <View style={styles.tags}>{["Node.js", "PostgreSQL"].map((t) => <View key={t} style={[styles.tag, { backgroundColor: palette.border }]}><T weight="medium" color={palette.subText} style={{ fontSize: 12 }}>{t}</T></View>)}</View>
        </SurfaceCard>
      </View>

      <T weight="bold" color={palette.text} style={[styles.sectionTitle, { marginHorizontal: 20, marginTop: 12 }]}>Recent Reviews</T>
      <View style={styles.pad}>
        {[{ n: "Sarah Jenkins", r: "Product Designer", d: people.female1, t: "Marcus is an incredible founder to work with. He has a clear vision and provides timely feedback." }, { n: "David Chen", r: "Full Stack Engineer", d: people.david, t: "Great communicator. ShopHub is doing cool work technically. Looking forward to the next contract!" }].map((r) => (
          <SurfaceCard key={r.n} style={styles.reviewCard}>
            <View style={styles.revTop}><Avatar source={r.d} size={40} /><View><T weight="bold" color={palette.text} style={{ fontSize: 24 / 1.4 }}>{r.n}</T><T weight="medium" color={palette.subText} style={{ fontSize: 13 }}>{r.r}</T></View><T weight="bold" color={palette.accent}>★★★★★</T></View>
            <T color={palette.text} style={styles.revBody}>"{r.t}"</T>
          </SurfaceCard>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
        <TouchableOpacity style={[styles.exitBtn, { backgroundColor: "#0A1633" }]} onPress={() => nav.push("/freelancer-stack/founder-dashboard")}> 
          <Ionicons name="log-out-outline" size={22} color="#fff" />
          <T weight="bold" color="#fff" style={{ fontSize: 18 }}>Exit Profile</T>
        </TouchableOpacity>
      </View>    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  profileTop: { alignItems: "center", paddingTop: 18 },
  avatarWrap: { position: "relative" },
  verify: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 50 / 1.8, marginTop: 10 },
  role: { fontSize: 20, marginTop: 2 },
  loc: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  actions: { flexDirection: "row", paddingHorizontal: 20, marginTop: 16, gap: 12 },
  mailBtn: { width: 58, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, marginTop: 16, gap: 10 },
  stat: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  statLabel: { fontSize: 10, letterSpacing: 1 },
  statValue: { fontSize: 20, marginTop: 4 },
  sectionHead: { marginTop: 18, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 38 / 2 },
  pad: { paddingHorizontal: 16, marginTop: 10, gap: 10 },
  postCard: { padding: 14 },
  postHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  postTitle: { fontSize: 32 / 2 },
  hot: { fontSize: 11 },
  postMeta: { marginTop: 2, fontSize: 14 },
  postBody: { marginTop: 10, fontSize: 17 / 1.1, lineHeight: 26 },
  tags: { marginTop: 10, flexDirection: "row", gap: 8 },
  tag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  reviewCard: { padding: 14 },
  revTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  revBody: { marginTop: 10, fontSize: 17 / 1.1, lineHeight: 28 },
  exitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
});
