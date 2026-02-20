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

export default function FreelancerProfileScreen() {
  const { palette, isDark } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Freelancer Profile" showLeft={false} right="ellipsis-horizontal" onRightPress={() => {}} />

      <View style={[styles.page, { backgroundColor: isDark ? "#210E0F" : palette.bg }]}> 
        <View style={styles.head}>
          <View style={styles.avatarWrap}>
            <Avatar source={people.alex} size={108} />
            <View style={styles.online} />
          </View>
          <T weight="bold" color={palette.text} style={styles.name}>Alex Rivers</T>
          <T weight="semiBold" color={palette.accent} style={styles.role}>Senior Full Stack Developer</T>
          <View style={styles.location}><Ionicons name="location" size={16} color={palette.subText} /><T weight="medium" color={palette.subText} style={{ fontSize: 18 }}>San Francisco, CA</T></View>
        </View>

        <View style={styles.actionRow}>
          <PrimaryButton label="Hire Me" onPress={() => nav.push("/freelancer-stack/contract-chat")} style={{ flex: 1 }} />
          <TouchableOpacity style={[styles.chatBtn, { backgroundColor: palette.accentSoft, borderColor: palette.accentSoft }]}>
            <Ionicons name="chatbubble" size={24} color={palette.accent} />
          </TouchableOpacity>
        </View>

        <SurfaceCard style={styles.availability}>
          <View>
            <T weight="bold" color={palette.text} style={{ fontSize: 35 / 1.9 }}>Availability Status</T>
            <T weight="medium" color={palette.subText} style={{ fontSize: 19 / 1.2 }}>Open to new opportunities</T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <T weight="bold" color={palette.accent} style={{ fontSize: 18, letterSpacing: 1 }}>OPEN</T>
            <View style={[styles.toggle, { backgroundColor: palette.accent }]}> <View style={styles.knob} /></View>
          </View>
        </SurfaceCard>

        <View style={styles.stats}>
          <SurfaceCard style={styles.statCard}>
            <T weight="medium" color={palette.subText}>Total Earned</T>
            <T weight="bold" color={palette.text} style={styles.big}>$12.5k</T>
            <View style={[styles.up, { backgroundColor: "rgba(53,209,118,0.2)" }]}><T weight="semiBold" color="#23A058">12%</T></View>
          </SurfaceCard>
          <SurfaceCard style={styles.statCard}>
            <T weight="medium" color={palette.subText}>Rating</T>
            <T weight="bold" color={palette.text} style={styles.big}>4.9/5</T>
            <T weight="semiBold" color={palette.subText}>Based on 48 gigs</T>
          </SurfaceCard>
        </View>

        <View style={styles.sectionHead}>
          <T weight="bold" color={palette.text} style={{ fontSize: 38 / 2 }}>Completed Gigs</T>
          <TouchableOpacity onPress={() => nav.push("/freelancer-stack/freelancer-profile-2")}> 
            <T weight="bold" color={palette.accent} style={{ fontSize: 17 }}>View All</T>
          </TouchableOpacity>
        </View>

        {["E-commerce Mobile App", "Real-time Dashboard"].map((title, idx) => (
          <SurfaceCard key={title} style={styles.reviewCard}>
            <View style={styles.reviewHead}><T weight="bold" color={palette.text} style={styles.reviewTitle}>{title}</T><T weight="bold" color="#F4C430">★★★★★</T></View>
            <T weight="medium" color={palette.subText} style={{ fontSize: 16 }}>{idx === 0 ? "Oct 2023 • Contract" : "Aug 2023 • Gig"}</T>
            <T color={palette.text} style={styles.quote}>"{idx === 0 ? "Alex delivered exceptional code quality for our storefront. Highly recommended." : "Super responsive and great problem solver. Managed to optimize our socket connections by 40%."}"</T>
            <View style={styles.client}><View style={[styles.smallDot, { backgroundColor: palette.subText }]} /><T weight="medium" color={palette.subText} style={{ fontSize: 16 }}>{idx === 0 ? "Marc J., Founder at ShopHub" : "Sarah L., CTO at DataFlow"}</T></View>
          </SurfaceCard>
        ))}
      </View>    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 12 },
  head: { alignItems: "center" },
  avatarWrap: { position: "relative" },
  online: {
    position: "absolute",
    right: 2,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2ED573",
    borderWidth: 2,
    borderColor: "#0A0A0A",
  },
  name: { fontSize: 54 / 1.8, marginTop: 10 },
  role: { fontSize: 20, marginTop: 2 },
  location: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  actionRow: { marginTop: 16, flexDirection: "row", gap: 10 },
  chatBtn: { width: 58, borderRadius: 14, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  availability: { marginTop: 14, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggle: { width: 56, height: 32, borderRadius: 16, justifyContent: "center" },
  knob: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFF", alignSelf: "flex-end", marginRight: 2 },
  stats: { flexDirection: "row", marginTop: 14, gap: 10 },
  statCard: { flex: 1, padding: 16 },
  big: { fontSize: 56 / 2.1, marginVertical: 8 },
  up: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  sectionHead: { marginTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewCard: { marginTop: 10, padding: 14 },
  reviewHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewTitle: { fontSize: 34 / 2.1 },
  quote: { marginTop: 10, fontSize: 17, lineHeight: 29, fontStyle: "italic" },
  client: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  smallDot: { width: 24, height: 24, borderRadius: 12 },
});
