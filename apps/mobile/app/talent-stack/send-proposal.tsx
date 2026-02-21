import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { FlowScreen, FlowTopBar, PrimaryButton, SurfaceCard, T, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

export default function SendProposalScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const [price, setPrice] = useState("2500");
  const [timeline, setTimeline] = useState("1 to 2 weeks");
  const [message, setMessage] = useState("");

  return (
    <FlowScreen>
      <FlowTopBar title="Send Proposal" onLeftPress={nav.back} />
      <View style={styles.content}>
        <T weight="semiBold" color={palette.accent} style={styles.subhead}>SENIOR PRODUCT DESIGNER</T>

        <SurfaceCard style={styles.card}>
          <T weight="bold" color={palette.text} style={styles.head}>Proposal Details</T>
          <T weight="medium" color={palette.subText} style={styles.helper}>Set your terms for this gig. Founder will review and respond via messages.</T>

          <T weight="semiBold" color={palette.subText} style={styles.label}>PROPOSED PRICE</T>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            style={[styles.input, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
            placeholder="₹2500"
            placeholderTextColor={palette.subText}
          />

          <T weight="semiBold" color={palette.subText} style={styles.label}>ESTIMATED TIMELINE</T>
          <TextInput
            value={timeline}
            onChangeText={setTimeline}
            style={[styles.input, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
            placeholder="1 to 2 weeks"
            placeholderTextColor={palette.subText}
          />

          <T weight="semiBold" color={palette.subText} style={styles.label}>MESSAGE TO FOUNDER</T>
          <TextInput
            multiline
            textAlignVertical="top"
            value={message}
            onChangeText={setMessage}
            style={[styles.textArea, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
            placeholder="Describe why you're a great fit for this project"
            placeholderTextColor={palette.subText}
          />
        </SurfaceCard>

        <PrimaryButton label="Submit Proposal" icon="send" onPress={() => nav.replace("/talent-stack/contracts")} />
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  subhead: { fontSize: 12, letterSpacing: 1.1 },
  card: { padding: 12 },
  head: { fontSize: 27, marginBottom: 6 },
  helper: { fontSize: 14, marginBottom: 12 },
  label: { fontSize: 11, letterSpacing: 0.9, marginTop: 10, marginBottom: 6 },
  input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontFamily: "Poppins_500Medium", fontSize: 14 },
  textArea: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
});
