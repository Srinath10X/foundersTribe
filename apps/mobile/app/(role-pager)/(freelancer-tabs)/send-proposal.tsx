import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { FlowScreen, SurfaceCard, T, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { useGig, useMyProposals, useSubmitProposal } from "@/hooks/useGig";
import { parseGigDescription } from "@/lib/gigContent";

export default function FreelancerSendProposalScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams<{ id?: string }>();

  const gigId = typeof params.id === "string" ? params.id : "";
  const hasValidGigId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(gigId);
  const { data: gig } = useGig(gigId, hasValidGigId);
  const { data: myProposals } = useMyProposals({ limit: 100 });
  const submitProposal = useSubmitProposal();

  const [price, setPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [availability, setAvailability] = useState("Immediate");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [milestonePlan, setMilestonePlan] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState<string[]>([]);

  const screeningQuestions = useMemo(
    () => parseGigDescription(gig?.description || "").screeningQuestions,
    [gig?.description],
  );

  useEffect(() => {
    if (screeningQuestions.length === 0) {
      setScreeningAnswers([]);
      return;
    }
    setScreeningAnswers((prev) => screeningQuestions.map((_, idx) => prev[idx] || ""));
  }, [screeningQuestions]);

  const suggestedBudget = gig
    ? `${Number(gig.budget_min || 0).toLocaleString()}-${Number(gig.budget_max || 0).toLocaleString()}`
    : "";

  const existingProposal = useMemo(() => {
    if (!gigId) return null;
    return (myProposals?.items || []).find((proposal) => proposal.gig_id === gigId) || null;
  }, [gigId, myProposals?.items]);

  const existingBlocksSubmit = !!existingProposal;

  const handleSubmit = async () => {
    if (!hasValidGigId) {
      Alert.alert("Invalid gig", "This gig link is invalid. Please open the gig from Browse Gigs and try again.");
      return;
    }
    if (!price.trim()) {
      Alert.alert("Missing price", "Please enter your proposal amount.");
      return;
    }
    if (!timeline.trim()) {
      Alert.alert("Missing timeline", "Please enter delivery timeline in days.");
      return;
    }
    if (!availability.trim()) {
      Alert.alert("Missing availability", "Please enter your start availability.");
      return;
    }
    if (coverNote.trim().length <= 20) {
      Alert.alert("Cover note too short", "Please provide at least 20 characters in cover note.");
      return;
    }
    if (
      screeningQuestions.length > 0 &&
      screeningAnswers.some((answer) => answer.trim().length < 5)
    ) {
      Alert.alert("Incomplete answers", "Please answer all screening questions.");
      return;
    }
    if (existingBlocksSubmit) {
      Alert.alert("Already submitted", "You have already submitted a proposal for this gig.");
      return;
    }

    const proposedAmount = Number(price.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(proposedAmount) || proposedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid proposal amount.");
      return;
    }

    const estimatedDays = Number(timeline.replace(/[^0-9]/g, ""));
    try {
      if (!gig?.id) {
        Alert.alert("Gig not loaded", "Please wait for gig details to load and try again.");
        return;
      }

      const screeningBlock = screeningQuestions.length > 0
        ? `\n\nScreening Answers:\n${screeningQuestions
            .map((question, index) => `${index + 1}. ${question}\nA: ${screeningAnswers[index]?.trim() || "-"}`)
            .join("\n\n")}`
        : "";

      await submitProposal.mutateAsync({
        gigId,
        data: {
          cover_letter: [
            coverNote.trim(),
            milestonePlan.trim() ? `\n\nMilestones:\n${milestonePlan.trim()}` : "",
            portfolioLink.trim() ? `\n\nPortfolio: ${portfolioLink.trim()}` : "",
            availability.trim() ? `\n\nAvailability: ${availability.trim()}` : "",
            screeningBlock,
          ].join(""),
          proposed_amount: proposedAmount,
          estimated_days: Number.isFinite(estimatedDays) && estimatedDays > 0 ? estimatedDays : undefined,
        },
      });

      Alert.alert("Proposal sent", "Your proposal has been submitted.", [
        { text: "OK", onPress: () => router.replace("/(role-pager)/(freelancer-tabs)/browse-gigs") },
      ]);
    } catch (error: any) {
      console.error("[send-proposal] submit error", {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        gigId,
      });
      if (error?.status === 409 || error?.code === "conflict") {
        Alert.alert("Already submitted", "A proposal for this gig already exists.");
        return;
      }
      Alert.alert("Submit failed", error?.message || "Unable to submit proposal right now.");
    }
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={17} color={palette.text} />
        </TouchableOpacity>

        <T weight="medium" color={palette.text} style={styles.headerTitle} numberOfLines={1}>
          Send Proposal
        </T>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <LinearGradient
            colors={[palette.accentSoft, palette.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: palette.borderLight }]}
          >
            <T weight="medium" color={palette.text} style={styles.gigTitle} numberOfLines={2}>
              {gig?.title || "Selected Gig"}
            </T>
            <T weight="regular" color={palette.subText} style={styles.gigMeta} numberOfLines={1}>
              {gig?.founder?.full_name || "Founder"}
            </T>

            <View style={styles.gigHints}>
              <View style={[styles.hintPill, { backgroundColor: palette.borderLight }]}> 
                <T weight="regular" color={palette.subText} style={styles.hintText}>
                  Budget {suggestedBudget || "N/A"}
                </T>
              </View>
              <View style={[styles.hintPill, { backgroundColor: palette.borderLight }]}> 
                <T weight="regular" color={palette.subText} style={styles.hintText}>
                  {gig?.is_remote ? "Remote" : gig?.location_text || "On-site"}
                </T>
              </View>
            </View>
          </LinearGradient>

          <SurfaceCard style={styles.formCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Pricing & Delivery
            </T>
            <View style={styles.twoColRow}>
              <View style={styles.col}>
                <T weight="medium" color={palette.subText} style={styles.label}>
                  Your Price (INR)
                </T>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="25000"
                  placeholderTextColor={palette.subText}
                  style={[styles.input, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
                />
              </View>
              <View style={styles.col}>
                <T weight="medium" color={palette.subText} style={styles.label}>
                  Delivery (days)
                </T>
                <TextInput
                  value={timeline}
                  onChangeText={setTimeline}
                  placeholder="14"
                  keyboardType="numeric"
                  placeholderTextColor={palette.subText}
                  style={[styles.input, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
                />
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={styles.col}>
                <T weight="medium" color={palette.subText} style={styles.label}>
                  Start Availability
                </T>
                <TextInput
                  value={availability}
                  onChangeText={setAvailability}
                  placeholder="Immediate"
                  placeholderTextColor={palette.subText}
                  style={[styles.input, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
                />
              </View>
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.formCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Cover Note
            </T>
            <TextInput
              multiline
              textAlignVertical="top"
              value={coverNote}
              onChangeText={setCoverNote}
              placeholder="Explain why you are a good fit and your approach."
              placeholderTextColor={palette.subText}
              style={[styles.textarea, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
            />
          </SurfaceCard>

          <SurfaceCard style={styles.formCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Additional Details
            </T>

            <T weight="medium" color={palette.subText} style={styles.label}>
              Portfolio URL
            </T>
            <TextInput
              value={portfolioLink}
              onChangeText={setPortfolioLink}
              placeholder="https://..."
              placeholderTextColor={palette.subText}
              autoCapitalize="none"
              style={[styles.input, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
            />

            <T weight="medium" color={palette.subText} style={styles.label}>
              Milestone Plan
            </T>
            <TextInput
              multiline
              textAlignVertical="top"
              value={milestonePlan}
              onChangeText={setMilestonePlan}
              placeholder="Break delivery into milestones with dates."
              placeholderTextColor={palette.subText}
              style={[styles.textareaSmall, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
            />
          </SurfaceCard>

          {screeningQuestions.length > 0 ? (
            <SurfaceCard style={styles.formCard}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Screening Questions
              </T>
              {screeningQuestions.map((question, index) => (
                <View key={`question-${index}`} style={styles.screeningBlock}>
                  <T weight="medium" color={palette.subText} style={styles.label}>
                    {index + 1}. {question}
                  </T>
                  <TextInput
                    multiline
                    textAlignVertical="top"
                    value={screeningAnswers[index] || ""}
                    onChangeText={(value) =>
                      setScreeningAnswers((prev) => {
                        const next = [...prev];
                        next[index] = value;
                        return next;
                      })
                    }
                    placeholder="Write your answer"
                    placeholderTextColor={palette.subText}
                    style={[styles.textareaSmall, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
                  />
                </View>
              ))}
            </SurfaceCard>
          ) : null}

          {existingProposal ? (
            <SurfaceCard style={styles.formCard}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Proposal Status
              </T>
              <T weight="regular" color={palette.subText} style={styles.statusText}>
                You already submitted this proposal. Current status: {existingProposal.status}
              </T>
            </SurfaceCard>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={submitProposal.isPending || existingBlocksSubmit}
            style={[
              styles.submitBtn,
              { backgroundColor: palette.accent, opacity: submitProposal.isPending || existingBlocksSubmit ? 0.45 : 1 },
            ]}
            onPress={handleSubmit}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <T weight="medium" color="#fff" style={styles.submitText}>
              {existingBlocksSubmit ? "Already Submitted" : submitProposal.isPending ? "Submitting..." : "Submit Proposal"}
            </T>
          </TouchableOpacity>

          <View style={{ height: tabBarHeight + 16 }} />
        </View>
      </ScrollView>
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
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 10,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
  },
  gigTitle: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  gigMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  gigHints: {
    marginTop: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hintPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hintText: {
    fontSize: 11,
    lineHeight: 14,
  },
  formCard: {
    padding: 13,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    lineHeight: 16,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 8,
  },
  col: {
    flex: 1,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    lineHeight: 17,
  },
  textareaSmall: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingTop: 9,
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  textarea: {
    marginTop: 8,
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingTop: 9,
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  screeningBlock: {
    marginTop: 6,
  },
  submitBtn: {
    marginTop: 2,
    minHeight: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    fontSize: 13,
    lineHeight: 17,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
