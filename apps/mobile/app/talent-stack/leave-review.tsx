import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { FlowScreen, FlowTopBar, PrimaryButton, SurfaceCard, T, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

export default function TalentLeaveReviewScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Leave a Review" left="close" onLeftPress={nav.back} />
      <View style={styles.content}>
        <SurfaceCard style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft }]}>
            <Ionicons name="ribbon" size={28} color={palette.accent} />
          </View>
          <T weight="bold" color={palette.text} style={styles.title}>SaaS Platform Redesign</T>
          <T weight="medium" color={palette.subText} style={styles.sub}>Gig for Veda Tech Pvt Ltd</T>
          <View style={[styles.status, { backgroundColor: "rgba(95,168,118,0.14)" }]}>
            <T weight="semiBold" color={palette.success} style={styles.sText}>CONTRACT COMPLETED</T>
          </View>
        </SurfaceCard>

        <T weight="semiBold" color={palette.subText} style={styles.rateLabel}>RATE THE FOUNDER</T>
        <View style={styles.stars}>{[1,2,3,4,5].map((n) => <Ionicons key={n} name="star" size={42} color={palette.accent} />)}</View>

        <View style={styles.rowBetween}>
          <T weight="bold" color={palette.text} style={styles.feedback}>Feedback for Founder</T>
          <T weight="medium" color={palette.subText} style={styles.optional}>Optional</T>
        </View>

        <TextInput
          multiline
          textAlignVertical="top"
          placeholder="Share your experience working with this founder."
          placeholderTextColor={palette.subText}
          style={[styles.input, { borderColor: palette.borderLight, backgroundColor: palette.surface, color: palette.text }]}
        />

        <PrimaryButton label="Submit Review" onPress={() => nav.replace("/talent-stack/contracts")} />
        <TouchableOpacity onPress={() => nav.back()} style={styles.exit}><T weight="semiBold" color={palette.subText} style={styles.feedback}>Exit</T></TouchableOpacity>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  hero: { padding: 14, alignItems: "center" },
  iconWrap: { width: 88, height: 88, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, marginTop: 10 },
  sub: { fontSize: 14, marginTop: 2 },
  status: { marginTop: 10, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  sText: { fontSize: 12, letterSpacing: 0.8 },
  rateLabel: { textAlign: "center", marginTop: 6, fontSize: 12, letterSpacing: 1.1 },
  stars: { flexDirection: "row", justifyContent: "center", gap: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  feedback: { fontSize: 15 },
  optional: { fontSize: 12 },
  input: { minHeight: 150, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingTop: 10, fontFamily: "Poppins_500Medium", fontSize: 14 },
  exit: { alignItems: "center", paddingVertical: 8 },
});
