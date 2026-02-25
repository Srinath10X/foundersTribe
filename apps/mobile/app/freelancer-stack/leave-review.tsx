import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { useContract, useMyContractRating, useSubmitRating } from "@/hooks/useGig";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const STORAGE_BUCKET = "tribe-media";

const ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function formatRole(raw?: string | null, fallback = "Freelancer") {
  if (!raw) return fallback;
  if (/^founder$/i.test(raw)) return "Founder";
  if (/^freelancer$/i.test(raw)) return "Freelancer";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function resolveAvatar(candidate: unknown, userId: string): Promise<string | null> {
  try {
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
      return candidate;
    }

    if (typeof candidate === "string" && candidate.trim()) {
      const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
      if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
    }

    if (!userId) return null;
    const folder = `profiles/${userId}`;
    const { data: files } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 20 });
    if (!Array.isArray(files) || files.length === 0) return null;
    const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
    if (!preferred?.name) return null;

    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
    return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
  } catch {
    return null;
  }
}

export default function LeaveReviewScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ contractId?: string | string[]; revieweeId?: string | string[] }>();
  const contractId = Array.isArray(params.contractId) ? params.contractId[0] : params.contractId || "";
  const routeRevieweeId = Array.isArray(params.revieweeId) ? params.revieweeId[0] : params.revieweeId || "";

  const { data: contract, isLoading, error, refetch } = useContract(contractId, !!contractId);
  const { data: existingRating, isLoading: ratingStatusLoading, refetch: refetchRatingStatus } = useMyContractRating(
    contractId,
    !!contractId,
  );
  const submitRating = useSubmitRating();

  const [score, setScore] = useState(4);
  const [reviewText, setReviewText] = useState("");
  const [revieweeProfile, setRevieweeProfile] = useState<{
    name: string;
    avatar: string | null;
    role: string;
  } | null>(null);

  const effectiveRevieweeId = useMemo(() => {
    if (routeRevieweeId) return routeRevieweeId;
    if (!contract) return "";
    return user?.id === contract.founder_id ? contract.freelancer_id : contract.founder_id;
  }, [contract, routeRevieweeId, user?.id]);

  const revieweeFromContract = useMemo(() => {
    if (!contract) return null;
    if (effectiveRevieweeId && effectiveRevieweeId === contract.freelancer_id) return contract.freelancer;
    if (effectiveRevieweeId && effectiveRevieweeId === contract.founder_id) return contract.founder;
    return contract.freelancer || contract.founder || null;
  }, [contract, effectiveRevieweeId]);

  const fallbackRevieweeName =
    firstString(revieweeFromContract?.full_name, revieweeFromContract?.handle) || "Member";
  const fallbackRevieweeAvatar = firstString(revieweeFromContract?.avatar_url);
  const fallbackRevieweeRole =
    effectiveRevieweeId && effectiveRevieweeId === contract?.founder_id ? "Founder" : "Freelancer";

  const revieweeName = revieweeProfile?.name || fallbackRevieweeName;
  const revieweeAvatar = revieweeProfile?.avatar || fallbackRevieweeAvatar || null;
  const revieweeRole = revieweeProfile?.role || fallbackRevieweeRole;
  const gigTitle = contract?.gig?.title || "Contract";
  const isFounderReviewer = Boolean(user?.id && contract && user.id === contract.founder_id);
  const isCompletedContract = contract?.status === "completed";
  const isReviewingFreelancer = Boolean(contract?.freelancer_id && effectiveRevieweeId === contract.freelancer_id);

  useEffect(() => {
    if (!effectiveRevieweeId) {
      setRevieweeProfile({
        name: fallbackRevieweeName,
        avatar: fallbackRevieweeAvatar || null,
        role: fallbackRevieweeRole,
      });
      return;
    }

    let cancelled = false;
    (async () => {
      const fallback = {
        name: fallbackRevieweeName,
        avatar: fallbackRevieweeAvatar || null,
        role: fallbackRevieweeRole,
      };
      const sessionResult = await supabase.auth.getSession().catch(() => null);
      const accessToken = sessionResult?.data?.session?.access_token || null;
      if (!accessToken) {
        if (!cancelled) setRevieweeProfile(fallback);
        return;
      }

      try {
        const raw = await tribeApi.getPublicProfile(accessToken, effectiveRevieweeId);
        const avatar = await resolveAvatar(
          raw?.photo_url || raw?.avatar_url || fallback.avatar,
          effectiveRevieweeId,
        );
        if (!cancelled) {
          setRevieweeProfile({
            name: firstString(raw?.display_name, raw?.full_name, raw?.username, fallback.name) || fallback.name,
            avatar: avatar || fallback.avatar,
            role: formatRole(firstString(raw?.role, raw?.user_type), fallback.role),
          });
        }
      } catch {
        if (!cancelled) setRevieweeProfile(fallback);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveRevieweeId, fallbackRevieweeAvatar, fallbackRevieweeName, fallbackRevieweeRole]);

  const handleSubmit = async () => {
    if (!contractId || !effectiveRevieweeId) {
      Alert.alert("Error", "Missing contract or reviewee information.");
      return;
    }
    if (!isFounderReviewer || !isCompletedContract || !isReviewingFreelancer) {
      Alert.alert("Review unavailable", "Only founders can review freelancers after contract completion.");
      return;
    }
    if (existingRating?.id) {
      Alert.alert("Already reviewed", "You have already submitted a review for this contract.");
      return;
    }

    try {
      await submitRating.mutateAsync({
        contractId,
        data: {
          reviewee_id: effectiveRevieweeId,
          score,
          review_text: reviewText.trim() || undefined,
        },
      });
      await refetchRatingStatus();
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

  if (!isFounderReviewer || !isCompletedContract || !isReviewingFreelancer) {
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
          <ErrorState
            title="Review not available"
            message="Only founders can review freelancers, and only after completed work."
            onRetry={nav.back}
          />
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
            <T weight="regular" color={palette.subText} style={styles.role} numberOfLines={1}>
              {revieweeRole} • {gigTitle}
            </T>
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
          label={existingRating?.id ? "Review Submitted" : ratingStatusLoading ? "Checking Review..." : "Submit Review"}
          onPress={handleSubmit}
          loading={submitRating.isPending}
          disabled={submitRating.isPending || ratingStatusLoading || Boolean(existingRating?.id)}
          style={{ marginTop: 6 }}
        />

        {existingRating?.id ? (
          <T weight="regular" color={palette.subText} style={styles.submittedNote}>
            You have already submitted a review for this contract.
          </T>
        ) : null}

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
  submittedNote: { textAlign: "center", marginTop: 2, fontSize: 11, lineHeight: 14 },
  contractId: { textAlign: "center", marginTop: 4, fontSize: 10, lineHeight: 13 },
});
