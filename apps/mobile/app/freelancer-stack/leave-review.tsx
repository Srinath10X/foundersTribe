import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { TouchableOpacity } from "react-native";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  PrimaryButton,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { useContract, useSubmitRating } from "@/hooks/useGig";

const ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

export default function LeaveReviewScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { contractId, revieweeId } = useLocalSearchParams<{ contractId?: string; revieweeId?: string }>();

  const { data: contract, isLoading, error, refetch } = useContract(contractId);
  const submitRating = useSubmitRating();

  const [score, setScore] = useState(4);
  const [reviewText, setReviewText] = useState("");

  const freelancer = contract?.freelancer;
  const revieweeName = freelancer?.full_name || freelancer?.handle || "Freelancer";
  const revieweeAvatar = freelancer?.avatar_url;
  const gigTitle = contract?.gig?.title || "Contract";

  const handleSubmit = async () => {
    if (!contractId || !revieweeId) {
      Alert.alert("Error", "Missing contract or reviewee information.");
      return;
    }

    try {
      await submitRating.mutateAsync({
        contractId,
        data: {
          reviewee_id: revieweeId,
          score,
          review_text: reviewText.trim() || undefined,
        },
      });
      Alert.alert("Review Submitted", "Thank you for your feedback!", [
        { text: "OK", onPress: () => nav.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Submit Failed", err?.message || "Could not submit your review. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <FlowScreen>
        <FlowTopBar title="Leave a Review" left="close" onLeftPress={nav.back} divider />
        <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
          <LoadingState rows={2} />
        </View>
      </FlowScreen>
    );
  }

  if (error || !contract) {
    return (
      <FlowScreen>
        <FlowTopBar title="Leave a Review" left="close" onLeftPress={nav.back} divider />
        <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
          <ErrorState
            title="Failed to load contract"
            message={error?.message || "Contract not found"}
            onRetry={() => refetch()}
          />
        </View>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen>
      <FlowTopBar title="Leave a Review" left="close" onLeftPress={nav.back} divider />

      <View style={[styles.body, { backgroundColor: palette.bg }]}>
        <View style={styles.center}>
          <View style={[styles.avatarWrap, { borderColor: palette.accentSoft }]}>
            <Avatar source={revieweeAvatar ? { uri: revieweeAvatar } : undefined} size={112} />
            <View style={[styles.verified, { backgroundColor: palette.accent }]}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </View>
          </View>
          <T weight="bold" color={palette.text} style={styles.name}>{revieweeName}</T>
          <T weight="medium" color={palette.subText} style={styles.role}>{gigTitle}</T>

          <T weight="medium" color={palette.text} style={styles.q}>How was your experience?</T>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setScore(n)} activeOpacity={0.7}>
                <Ionicons
                  name="star"
                  size={30}
                  color={n <= score ? palette.accent : palette.border}
                />
              </TouchableOpacity>
            ))}
          </View>
          <T weight="bold" color={palette.accent} style={styles.ratingTxt}>
            {ratingLabels[score] || ""} ({score}/5)
          </T>
        </View>

        <T weight="medium" color={palette.subText} style={styles.feedbackLabel}>Detailed Feedback (Optional)</T>
        <TextInput
          multiline
          textAlignVertical="top"
          placeholder="Tell us more about the collaboration..."
          placeholderTextColor={palette.subText}
          value={reviewText}
          onChangeText={setReviewText}
          style={[
            styles.feedbackInput,
            { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface },
          ]}
        />

        <View style={styles.noteRow}>
          <Ionicons name="information-circle" size={18} color={palette.subText} />
          <T weight="medium" color={palette.subText} style={styles.note}>
            Your review will be public and appear on {revieweeName}'s profile to help other founders in the network.
          </T>
        </View>

        <PrimaryButton
          label="Submit Review"
          onPress={handleSubmit}
          loading={submitRating.isPending}
          disabled={submitRating.isPending}
          style={{ marginTop: 18 }}
        />

        <T weight="semiBold" color={palette.subText} style={styles.contractId}>
          CONTRACT ID: #{contract.id.substring(0, 8).toUpperCase()}
        </T>
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
  name: { fontSize: 24, marginTop: 12 },
  role: { fontSize: 15, marginTop: 4 },
  q: { fontSize: 18, marginTop: 28 },
  stars: { flexDirection: "row", gap: 14, marginTop: 16 },
  ratingTxt: { fontSize: 20, marginTop: 16 },
  feedbackLabel: { fontSize: 16, marginTop: 26, marginBottom: 12 },
  feedbackInput: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16 },
  note: { flex: 1, fontSize: 14, lineHeight: 21 },
  contractId: { textAlign: "center", marginTop: 20, letterSpacing: 1.1, fontSize: 13 },
});
