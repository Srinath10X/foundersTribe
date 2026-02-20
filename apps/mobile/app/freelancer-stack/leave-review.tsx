import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  PrimaryButton,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

export default function LeaveReviewScreen() {
  const { palette, isDark } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Leave a Review" left="close" onLeftPress={nav.back} divider />

      <View style={[styles.body, { backgroundColor: isDark ? "#1A0809" : palette.bg }]}> 
        <View style={styles.center}>
          <View style={[styles.avatarWrap, { borderColor: palette.accentSoft }]}> 
            <Avatar source={people.alex} size={112} />
            <View style={[styles.verified, { backgroundColor: palette.accent }]}> 
              <Ionicons name="checkmark" size={18} color="#fff" />
            </View>
          </View>
          <T weight="bold" color={palette.text} style={styles.name}>Alex Rivera</T>
          <T weight="medium" color={palette.subText} style={styles.role}>Lead Product Designer • UI/UX App</T>

          <T weight="medium" color={palette.text} style={styles.q}>How was your experience?</T>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Ionicons key={n} name="star" size={52 / 1.6} color={n < 5 ? palette.accent : isDark ? "#2A3753" : "#CFD7E4"} />
            ))}
          </View>
          <T weight="bold" color={palette.accent} style={styles.ratingTxt}>Great (4/5)</T>
        </View>

        <T weight="medium" color={palette.subText} style={styles.feedbackLabel}>Detailed Feedback (Optional)</T>
        <TextInput
          multiline
          textAlignVertical="top"
          placeholder="Tell us more about the collaboration..."
          placeholderTextColor={palette.subText}
          style={[styles.feedbackInput, { borderColor: palette.accentSoft, color: palette.text, backgroundColor: isDark ? "#221114" : palette.surface }]}
        />

        <View style={styles.noteRow}>
          <Ionicons name="information-circle" size={18} color={palette.subText} />
          <T weight="medium" color={palette.subText} style={styles.note}>
            Your review will be public and appear on Alex's profile to help other founders in the network.
          </T>
        </View>

        <PrimaryButton label="Submit Review" onPress={() => nav.push("/freelancer-stack/founder-profile")} style={{ marginTop: 18 }} />

        <T weight="semiBold" color={palette.subText} style={styles.contractId}>CONTRACT ID: #GIG-29402-24</T>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 22, paddingTop: 18 },
  center: { alignItems: "center" },
  avatarWrap: { borderWidth: 1.5, width: 132, height: 132, borderRadius: 66, justifyContent: "center", alignItems: "center" },
  verified: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 56 / 1.8, marginTop: 12 },
  role: { fontSize: 44 / 2.1, marginTop: 4 },
  q: { fontSize: 58 / 2.2, marginTop: 28 },
  stars: { flexDirection: "row", gap: 14, marginTop: 16 },
  ratingTxt: { fontSize: 47 / 2.1, marginTop: 16 },
  feedbackLabel: { fontSize: 35 / 2, marginTop: 26, marginBottom: 12 },
  feedbackInput: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    fontFamily: "Poppins_500Medium",
    fontSize: 42 / 2.2,
    lineHeight: 58 / 2.2,
  },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16 },
  note: { flex: 1, fontSize: 35 / 2.3, lineHeight: 52 / 2.3 },
  contractId: { textAlign: "center", marginTop: 20, letterSpacing: 1.4, fontSize: 29 / 2 },
});
