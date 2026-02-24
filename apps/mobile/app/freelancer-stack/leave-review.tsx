import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Avatar,
  FlowScreen,
  PrimaryButton,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
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
      Alert.alert("Review Submitted", "Thank you for your feedback!", [{ text: "OK", onPress: () => nav.back() }]);
    } catch (err: any) {
      Alert.alert("Submit Failed", err?.message || "Could not submit your review. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="close" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Leave a Review</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Share collaboration feedback</T>
          </View>
        </View>
        <View style={styles.content}><LoadingState rows={3} /></View>
      </FlowScreen>
    );
  }

  if (error || !contract) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="close" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Leave a Review</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Share collaboration feedback</T>
          </View>
        </View>
        <View style={styles.content}>
          <ErrorState title="Failed to load contract" message={error?.message || "Contract not found"} onRetry={() => refetch()} />
        </View>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
          <Ionicons name="close" size={15} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Leave a Review</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Share collaboration feedback</T>
        </View>
      </View>

      <View style={styles.content}>
        <SurfaceCard style={styles.profileCard}>
          <View style={styles.center}>
            <Avatar source={revieweeAvatar ? { uri: revieweeAvatar } : undefined} size={66} />
            <T weight="medium" color={palette.text} style={styles.name}>{revieweeName}</T>
            <T weight="regular" color={palette.subText} style={styles.role} numberOfLines={1}>{gigTitle}</T>
          </View>

          <T weight="regular" color={palette.text} style={styles.question}>How was your experience?</T>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setScore(n)} activeOpacity={0.75}>
                <Ionicons name="star" size={24} color={n <= score ? palette.accent : palette.border} />
              </TouchableOpacity>
            ))}
          </View>
          <T weight="medium" color={palette.accent} style={styles.ratingTxt}>{ratingLabels[score]} ({score}/5)</T>
        </SurfaceCard>

        <SurfaceCard style={styles.feedbackCard}>
          <T weight="regular" color={palette.subText} style={styles.feedbackLabel}>Detailed Feedback (Optional)</T>
          <TextInput
            multiline
            textAlignVertical="top"
            placeholder="Tell us more about the collaboration..."
            placeholderTextColor={palette.subText}
            value={reviewText}
            onChangeText={setReviewText}
            style={[styles.feedbackInput, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
          />
          <View style={styles.noteRow}>
            <Ionicons name="information-circle" size={14} color={palette.subText} />
            <T weight="regular" color={palette.subText} style={styles.note}>
              Your review will be visible on this freelancer&apos;s profile.
            </T>
          </View>
        </SurfaceCard>

        <PrimaryButton
          label="Submit Review"
          onPress={handleSubmit}
          loading={submitRating.isPending}
          disabled={submitRating.isPending}
          style={{ marginTop: 6 }}
        />

        <T weight="regular" color={palette.subText} style={styles.contractId}>
          Contract #{contract.id.substring(0, 8).toUpperCase()}
        </T>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  pageSubtitle: { marginTop: 1, fontSize: 12, lineHeight: 16 },
  content: { paddingHorizontal: 18, paddingTop: 14, gap: 8 },
  profileCard: { padding: 12 },
  center: { alignItems: "center" },
  name: { marginTop: 8, fontSize: 14, lineHeight: 19 },
  role: { marginTop: 2, fontSize: 11, lineHeight: 14 },
  question: { marginTop: 12, fontSize: 12, lineHeight: 16, textAlign: "center" },
  stars: { marginTop: 10, flexDirection: "row", justifyContent: "center", gap: 10 },
  ratingTxt: { marginTop: 8, fontSize: 12, lineHeight: 16, textAlign: "center" },
  feedbackCard: { padding: 12 },
  feedbackLabel: { fontSize: 11, lineHeight: 14, marginBottom: 8 },
  feedbackInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  noteRow: { marginTop: 8, flexDirection: "row", alignItems: "flex-start", gap: 6 },
  note: { flex: 1, fontSize: 11, lineHeight: 14 },
  contractId: { textAlign: "center", marginTop: 4, fontSize: 10, lineHeight: 13 },
});
