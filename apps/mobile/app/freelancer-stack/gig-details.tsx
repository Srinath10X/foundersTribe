import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  Badge,
  FlowScreen,
  FlowTopBar,
  PrimaryButton,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

export default function GigDetailsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar
        title="Gig Details"
        onLeftPress={nav.back}
        right="create-outline"
        onRightPress={() => nav.push("/freelancer-stack/post-gig")}
      />

      <View style={styles.sectionPad}>
        <Badge label="Hiring" tone="success" />
        <T weight="bold" color={palette.text} style={styles.title}>UI/UX Designer for Fintech App</T>
        <T weight="medium" color={palette.subText} style={styles.subtitle}>Posted 2 days ago</T>
      </View>

      <View style={[styles.rowStats, { borderColor: palette.border }]}> 
        <View style={[styles.statCol, { borderRightColor: palette.border }]}> 
          <T weight="semiBold" color={palette.subText} style={styles.label}>Budget Range</T>
          <T weight="bold" color={palette.accent} style={styles.value}>$1,200 - $2,500</T>
        </View>
        <View style={styles.statCol}> 
          <T weight="semiBold" color={palette.subText} style={styles.label}>Timeline</T>
          <T weight="bold" color={palette.text} style={styles.value}>2-4 Weeks</T>
        </View>
      </View>

      <View style={[styles.sectionPad, styles.spaced, { borderTopColor: palette.border, borderBottomColor: palette.border }]}> 
        <T weight="bold" color={palette.text} style={styles.head}>Description</T>
        <T color={palette.subText} style={styles.body}>
          We are looking for a senior-level UI/UX designer to revamp our existing fintech dashboard. The goal is to
          simplify complex financial data into digestible, beautiful visualizations.{"\n\n"}
          The project includes designing 12-15 high-fidelity screens, creating a basic design system in Figma, and
          ensuring all accessibility standards are met for financial applications.
        </T>
      </View>

      <View style={[styles.sectionPad, styles.spaced, { borderBottomColor: palette.border }]}> 
        <T weight="bold" color={palette.text} style={styles.head}>Required Skills</T>
        <View style={styles.tags}>
          {["Figma", "UI Design", "Fintech", "Design Systems", "User Testing"].map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: palette.border }]}> 
              <T weight="medium" color={palette.text} style={styles.tagText}>{tag}</T>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.sectionPad, styles.spaced]}>
        <View style={styles.appHead}>
          <T weight="bold" color={palette.text} style={styles.head}>Top Applicants (12)</T>
          <T weight="bold" color={palette.accent} style={{ fontSize: 13 }}>BEST MATCH</T>
        </View>
        {[{ n: "Alex Rivera", p: people.alex, v: "$1,200 • 14 days", r: "4.9" }, { n: "Sarah Chen", p: people.sarah, v: "$1,550 • 10 days", r: "5.0" }, { n: "Jordan Smith", p: people.jordan, v: "$950 • 21 days", r: "4.7" }].map((u) => (
          <View key={u.n} style={styles.appRow}>
            <Avatar source={u.p} size={50} />
            <View style={{ flex: 1 }}>
              <T weight="bold" color={palette.text} style={{ fontSize: 18 }}>{u.n}</T>
              <T weight="medium" color={palette.subText} style={{ fontSize: 16 }}>Proposed: {u.v}</T>
            </View>
            <View style={styles.starWrap}>
              <Ionicons name="star" size={15} color="#F4C430" />
              <T weight="semiBold" color={palette.text} style={{ fontSize: 18 }}>{u.r}</T>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: palette.accent }]}
          onPress={() => nav.push("/freelancer-stack/gig-proposals")}
        >
          <T weight="bold" color={palette.accent} style={{ fontSize: 18 }}>Review All Proposals</T>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.exitLink} onPress={() => nav.push("/freelancer-stack/founder-dashboard")}>
        <Ionicons name="close" size={22} color={palette.subText} />
        <T weight="semiBold" color={palette.subText} style={{ fontSize: 17 }}>Exit to Dashboard</T>
      </TouchableOpacity>

      <View style={{ paddingHorizontal: 24, marginTop: 22 }}>
        <PrimaryButton label="Close Gig Early" onPress={() => nav.push("/freelancer-stack/leave-review")} />
      </View>    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  sectionPad: { paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 42 / 1.6, marginTop: 10 },
  subtitle: { fontSize: 32 / 2.4, marginTop: 4 },
  rowStats: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, marginTop: 14 },
  statCol: { flex: 1, padding: 16, borderRightWidth: 1 },
  label: { textTransform: "uppercase", fontSize: 12, letterSpacing: 0.7 },
  value: { fontSize: 33 / 1.5, marginTop: 8 },
  spaced: { borderBottomWidth: 1, paddingBottom: 18 },
  head: { fontSize: 35 / 1.6, marginBottom: 12 },
  body: { fontSize: 17, lineHeight: 30 },
  tags: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  tagText: { fontSize: 18 / 1.1 },
  appHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  starWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  outlineBtn: { borderWidth: 1.4, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 18 },
  exitLink: { marginTop: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
});
