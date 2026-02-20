import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Avatar, Badge, FlowScreen, FlowTopBar, SurfaceCard, T, people, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

const contracts = [
  { id: "1", gig: "SaaS Platform Redesign", founder: "Alex Rivers", status: "active", amount: "$2,500", milestone: "Milestone 3/4" },
  { id: "2", gig: "Mobile App Prototyping", founder: "Sarah Chen", status: "active", amount: "$1,600", milestone: "Milestone 1/3" },
  { id: "3", gig: "Logo Design for Fintech", founder: "Jordan Smith", status: "completed", amount: "$500", milestone: "Completed" },
] as const;

export default function ContractsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="My Contracts" showLeft={false} right="funnel-outline" onRightPress={() => {}} />

      <View style={styles.content}>
        {contracts.map((c) => (
          <SurfaceCard key={c.id} style={styles.card}>
            <View style={styles.head}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="bold" color={palette.text} style={styles.title} numberOfLines={1}>{c.gig}</T>
                <View style={styles.row}>
                  <Avatar source={c.founder === "Alex Rivers" ? people.alex : c.founder === "Sarah Chen" ? people.sarah : people.jordan} size={22} />
                  <T weight="medium" color={palette.subText} style={styles.meta}>{c.founder}</T>
                </View>
              </View>
              <Badge label={c.status === "active" ? "Active" : "Completed"} tone={c.status === "active" ? "success" : "neutral"} />
            </View>

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            <View style={styles.rowBetween}>
              <T weight="semiBold" color={palette.subText} style={styles.meta}>{c.milestone}</T>
              <T weight="bold" color={palette.text} style={styles.amount}>{c.amount}</T>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: palette.surface, borderColor: palette.borderLight }]} onPress={() => nav.push("/talent-stack/contract-details")}> 
                <T weight="semiBold" color={palette.text} style={styles.btnTxt}>Details</T>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: palette.accent }]} onPress={() => nav.push("/talent-stack/chat-thread")}> 
                <T weight="bold" color="#fff" style={styles.btnTxt}>Chat</T>
              </TouchableOpacity>
            </View>

            {c.status === "completed" ? (
              <TouchableOpacity style={styles.review} onPress={() => nav.push("/talent-stack/leave-review")}> 
                <Ionicons name="star-outline" size={16} color={palette.accent} />
                <T weight="semiBold" color={palette.accent} style={styles.meta}>Leave a review</T>
              </TouchableOpacity>
            ) : null}
          </SurfaceCard>
        ))}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  card: { padding: 12 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  title: { fontSize: 17 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  meta: { fontSize: 13 },
  divider: { height: 1, marginVertical: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { fontSize: 18 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  btn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  btnTxt: { fontSize: 13 },
  review: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 },
});
