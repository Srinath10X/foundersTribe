import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { Avatar, FlowScreen, SurfaceCard, T, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import { useGig, useMyProposals, useSubmitProposal } from "@/hooks/useGig";
import { parseGigDescription } from "@/lib/gigContent";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const STORAGE_BUCKET = "tribe-media";
const MIN_COVER_NOTE_LENGTH = 40;
const MIN_SCREENING_ANSWER_LENGTH = 5;

type FounderProfileView = {
  name: string;
  handle: string | null;
  role: string | null;
  avatar: string | null;
};

type ValuePreset<T extends string | number> = {
  id: string;
  label: string;
  value: T;
};

type ProposalFormErrors = {
  price?: string;
  timeline?: string;
  availability?: string;
  coverNote?: string;
  portfolioLink?: string;
  screening?: string;
};

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function normalizeHandle(value: unknown) {
  const raw = firstString(value);
  if (!raw) return null;
  return raw.replace(/^@+/, "");
}

function formatRole(value: unknown) {
  const raw = firstString(value);
  if (!raw) return null;
  if (/^founder$/i.test(raw)) return "Founder";
  if (/^freelancer$/i.test(raw)) return "Freelancer";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStatus(value?: string | null) {
  if (!value) return "Pending";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatInr(value?: number | null) {
  if (!Number.isFinite(value || 0)) return "INR 0";
  return `INR ${Number(value || 0).toLocaleString()}`;
}

function normalizeUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function isValidUrl(value: string) {
  const raw = value.trim();
  if (!raw) return true;
  try {
    new URL(normalizeUrl(raw));
    return true;
  } catch {
    return false;
  }
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
    const preferred = files.find((file) => /^avatar\./i.test(file.name)) || files[0];
    if (!preferred?.name) return null;

    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
    return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
  } catch {
    return null;
  }
}

async function buildFounderProfileView(
  rawProfile: any,
  founderId: string,
  fallback: FounderProfileView,
): Promise<FounderProfileView> {
  const avatarCandidate =
    firstString(rawProfile?.photo_url, rawProfile?.avatar_url, fallback.avatar) || null;
  const avatar = await resolveAvatar(avatarCandidate, founderId);

  return {
    name:
      firstString(rawProfile?.display_name, rawProfile?.full_name, rawProfile?.name, fallback.name) ||
      "Founder",
    handle: normalizeHandle(rawProfile?.username) || normalizeHandle(rawProfile?.handle) || fallback.handle,
    role: formatRole(rawProfile?.role) || formatRole(rawProfile?.user_type) || fallback.role,
    avatar: avatar || fallback.avatar,
  };
}

export default function FreelancerSendProposalScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const queryClient = useQueryClient();
  const { session } = useAuth();
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
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const parsedGigContent = useMemo(() => parseGigDescription(gig?.description || ""), [gig?.description]);
  const screeningQuestions = parsedGigContent.screeningQuestions;

  useEffect(() => {
    if (screeningQuestions.length === 0) {
      setScreeningAnswers([]);
      return;
    }
    setScreeningAnswers((prev) => screeningQuestions.map((_, idx) => prev[idx] || ""));
  }, [screeningQuestions]);

  const founderFallback = useMemo<FounderProfileView>(
    () => ({
      name: firstString(gig?.founder?.full_name) || "Founder",
      handle: normalizeHandle(gig?.founder?.handle),
      role: "Founder",
      avatar: firstString(gig?.founder?.avatar_url),
    }),
    [gig?.founder?.avatar_url, gig?.founder?.full_name, gig?.founder?.handle],
  );
  const [founderProfile, setFounderProfile] = useState<FounderProfileView>(founderFallback);

  useEffect(() => {
    setFounderProfile(founderFallback);
  }, [founderFallback]);

  useEffect(() => {
    const founderId = firstString(gig?.founder_id);
    const token = session?.access_token;
    if (!founderId || !token) return;

    let cancelled = false;
    (async () => {
      const cached = queryClient.getQueryData<any>(["tribe-public-profile", founderId]);
      if (cached) {
        const hydrated = await buildFounderProfileView(cached, founderId, founderFallback);
        if (!cancelled) setFounderProfile(hydrated);
      }

      try {
        const raw = await tribeApi.getPublicProfile(token, founderId);
        queryClient.setQueryData(["tribe-public-profile", founderId], raw);
        const hydrated = await buildFounderProfileView(raw, founderId, founderFallback);
        if (!cancelled) setFounderProfile(hydrated);
      } catch {
        // Keep gig payload fallback if Tribe profile fetch fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [founderFallback, gig?.founder_id, queryClient, session?.access_token]);

  const founderMeta = founderProfile.handle
    ? `@${founderProfile.handle}`
    : founderProfile.role || "Founder";

  const budgetMin = Number(gig?.budget_min || 0);
  const budgetMax = Number(gig?.budget_max || 0);
  const suggestedBudget = gig
    ? `${Number(gig.budget_min || 0).toLocaleString()}-${Number(gig.budget_max || 0).toLocaleString()}`
    : "";

  const amountPresets = useMemo(() => {
    if (!gig) return [] as number[];
    const min = Number(gig.budget_min || 0);
    const max = Number(gig.budget_max || 0);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min > max) {
      return [];
    }
    const mid = Math.round((min + max) / 2);
    return Array.from(new Set([min, mid, max])).filter((value) => value > 0);
  }, [gig]);

  const timelinePresets = useMemo(() => {
    const parsedValue = Number(parsedGigContent.timelineValue || 0);
    const parsedUnit = String(parsedGigContent.timelineUnit || "").toLowerCase();
    const parsedDays = parsedValue > 0
      ? parsedUnit.includes("week")
        ? parsedValue * 7
        : parsedValue
      : 0;

    const base = [parsedDays, 7, 14, 21, 30].filter((days) => Number.isFinite(days) && days > 0);
    const unique = Array.from(new Set(base)).sort((a, b) => a - b);
    return unique.map((days) => ({
      id: `days-${days}`,
      label: parsedDays > 0 && days === parsedDays ? `Target ${days}d` : `${days} days`,
      value: days,
    })) as ValuePreset<number>[];
  }, [parsedGigContent.timelineUnit, parsedGigContent.timelineValue]);

  const availabilityPresets: ValuePreset<string>[] = useMemo(
    () => [
      { id: "availability-24h", label: "Immediate (24h)", value: "Immediate (within 24 hours)" },
      { id: "availability-3d", label: "Within 3 days", value: "Within 3 days" },
      { id: "availability-1w", label: "Within 1 week", value: "Within 1 week" },
    ],
    [],
  );

  const existingProposal = useMemo(() => {
    if (!gigId) return null;
    return (myProposals?.items || []).find((proposal) => proposal.gig_id === gigId) || null;
  }, [gigId, myProposals?.items]);

  const existingBlocksSubmit = !!existingProposal;
  const proposedAmount = Number(price.replace(/[^0-9.]/g, ""));
  const estimatedDays = Number(timeline.replace(/[^0-9]/g, ""));
  const withinSuggestedBudget =
    Number.isFinite(proposedAmount) && proposedAmount > 0 && budgetMin > 0 && budgetMax > 0
      ? proposedAmount >= budgetMin && proposedAmount <= budgetMax
      : null;

  const formErrors = useMemo<ProposalFormErrors>(() => {
    const errors: ProposalFormErrors = {};

    if (!price.trim()) {
      errors.price = "Enter your proposal amount.";
    } else if (!Number.isFinite(proposedAmount) || proposedAmount <= 0) {
      errors.price = "Enter a valid amount greater than 0.";
    }

    if (!timeline.trim()) {
      errors.timeline = "Enter delivery timeline in days.";
    } else if (!Number.isFinite(estimatedDays) || estimatedDays <= 0) {
      errors.timeline = "Timeline must be at least 1 day.";
    } else if (estimatedDays > 365) {
      errors.timeline = "Timeline cannot exceed 365 days.";
    }

    if (!availability.trim()) {
      errors.availability = "Share when you can start.";
    }

    if (coverNote.trim().length < MIN_COVER_NOTE_LENGTH) {
      errors.coverNote = `Cover note should be at least ${MIN_COVER_NOTE_LENGTH} characters.`;
    }

    if (!isValidUrl(portfolioLink)) {
      errors.portfolioLink = "Portfolio URL is invalid.";
    }

    if (
      screeningQuestions.length > 0 &&
      screeningAnswers.some((answer) => answer.trim().length < MIN_SCREENING_ANSWER_LENGTH)
    ) {
      errors.screening = `Answer each screening question with at least ${MIN_SCREENING_ANSWER_LENGTH} characters.`;
    }

    return errors;
  }, [
    availability,
    coverNote,
    estimatedDays,
    portfolioLink,
    price,
    proposedAmount,
    screeningAnswers,
    screeningQuestions,
    timeline,
  ]);

  const readinessChecks = useMemo(
    () => [
      { label: "Pricing and timeline added", done: !formErrors.price && !formErrors.timeline },
      { label: "Cover note is strong enough", done: !formErrors.coverNote },
      { label: "Screening answers completed", done: !formErrors.screening },
    ],
    [formErrors.coverNote, formErrors.price, formErrors.screening, formErrors.timeline],
  );

  const canSubmit =
    hasValidGigId &&
    !!gig?.id &&
    !existingBlocksSubmit &&
    Object.keys(formErrors).length === 0;

  const handleSubmit = async () => {
    setSubmitAttempted(true);

    if (!hasValidGigId) {
      Alert.alert("Invalid gig", "This gig link is invalid. Please open the gig from Browse Gigs and try again.");
      return;
    }
    if (existingBlocksSubmit) {
      Alert.alert("Already submitted", "You have already submitted a proposal for this gig.");
      return;
    }

    const firstError = Object.values(formErrors).find(Boolean);
    if (firstError) {
      Alert.alert("Please review form", firstError);
      return;
    }

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
            portfolioLink.trim() ? `\n\nPortfolio: ${normalizeUrl(portfolioLink)}` : "",
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

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

            <View style={styles.ownerRow}>
              <Avatar source={founderProfile.avatar || undefined} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.ownerName} numberOfLines={1}>
                  {founderProfile.name}
                </T>
                <T weight="regular" color={palette.subText} style={styles.ownerMeta} numberOfLines={1}>
                  {founderMeta}
                </T>
              </View>
            </View>

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
              <View style={[styles.hintPill, { backgroundColor: palette.borderLight }]}>
                <T weight="regular" color={palette.subText} style={styles.hintText}>
                  {gig?.experience_level || "mid"} level
                </T>
              </View>
            </View>
          </LinearGradient>

          <SurfaceCard style={styles.formCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Pricing & Delivery
            </T>
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
            {submitAttempted && formErrors.price ? (
              <T weight="regular" color="#FF3B30" style={styles.errorText}>
                {formErrors.price}
              </T>
            ) : null}
            {withinSuggestedBudget !== null ? (
              <T
                weight="regular"
                color={withinSuggestedBudget ? "#34C759" : "#F59E0B"}
                style={styles.helperText}
              >
                {withinSuggestedBudget
                  ? "Inside founder's suggested budget."
                  : "Outside suggested budget. Explain the value in your cover note."}
              </T>
            ) : null}

            {amountPresets.length > 0 ? (
              <View style={styles.presetRow}>
                {amountPresets.map((amount) => {
                  const active = Number.isFinite(proposedAmount) && proposedAmount === amount;
                  return (
                    <TouchableOpacity
                      key={`amount-${amount}`}
                      activeOpacity={0.88}
                      onPress={() => setPrice(String(amount))}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: active ? palette.accentSoft : palette.surface,
                          borderColor: active ? palette.accent : palette.borderLight,
                        },
                      ]}
                    >
                      <T weight="medium" color={active ? palette.accent : palette.subText} style={styles.presetChipText}>
                        {formatInr(amount)}
                      </T>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

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
            {submitAttempted && formErrors.timeline ? (
              <T weight="regular" color="#FF3B30" style={styles.errorText}>
                {formErrors.timeline}
              </T>
            ) : null}
            <View style={styles.presetRow}>
              {timelinePresets.map((preset) => {
                const active = Number.isFinite(estimatedDays) && estimatedDays === preset.value;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    activeOpacity={0.88}
                    onPress={() => setTimeline(String(preset.value))}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: active ? palette.accentSoft : palette.surface,
                        borderColor: active ? palette.accent : palette.borderLight,
                      },
                    ]}
                  >
                    <T weight="medium" color={active ? palette.accent : palette.subText} style={styles.presetChipText}>
                      {preset.label}
                    </T>
                  </TouchableOpacity>
                );
              })}
            </View>

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
            {submitAttempted && formErrors.availability ? (
              <T weight="regular" color="#FF3B30" style={styles.errorText}>
                {formErrors.availability}
              </T>
            ) : null}
            <View style={styles.presetRow}>
              {availabilityPresets.map((preset) => {
                const active = availability.trim().toLowerCase() === preset.value.toLowerCase();
                return (
                  <TouchableOpacity
                    key={preset.id}
                    activeOpacity={0.88}
                    onPress={() => setAvailability(preset.value)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: active ? palette.accentSoft : palette.surface,
                        borderColor: active ? palette.accent : palette.borderLight,
                      },
                    ]}
                  >
                    <T weight="medium" color={active ? palette.accent : palette.subText} style={styles.presetChipText}>
                      {preset.label}
                    </T>
                  </TouchableOpacity>
                );
              })}
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
              placeholder="Explain why you are a good fit, approach, and expected outcomes."
              placeholderTextColor={palette.subText}
              style={[styles.textarea, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
            />
            <View style={styles.metaInlineRow}>
              <T weight="regular" color={palette.subText} style={styles.helperText}>
                {coverNote.trim().length}/{MIN_COVER_NOTE_LENGTH} minimum characters
              </T>
            </View>
            {submitAttempted && formErrors.coverNote ? (
              <T weight="regular" color="#FF3B30" style={styles.errorText}>
                {formErrors.coverNote}
              </T>
            ) : null}
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
            {submitAttempted && formErrors.portfolioLink ? (
              <T weight="regular" color="#FF3B30" style={styles.errorText}>
                {formErrors.portfolioLink}
              </T>
            ) : null}

            <T weight="medium" color={palette.subText} style={styles.label}>
              Milestone Plan
            </T>
            <TextInput
              multiline
              textAlignVertical="top"
              value={milestonePlan}
              onChangeText={setMilestonePlan}
              placeholder="Break delivery into milestones with expected check-ins."
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
                  <T weight="regular" color={palette.subText} style={styles.helperText}>
                    {(screeningAnswers[index] || "").trim().length} characters
                  </T>
                </View>
              ))}
              {submitAttempted && formErrors.screening ? (
                <T weight="regular" color="#FF3B30" style={styles.errorText}>
                  {formErrors.screening}
                </T>
              ) : null}
            </SurfaceCard>
          ) : null}

          <SurfaceCard style={styles.formCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Proposal Readiness
            </T>
            <View style={styles.readinessList}>
              {readinessChecks.map((check) => (
                <View key={check.label} style={styles.readinessRow}>
                  <Ionicons
                    name={check.done ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={check.done ? "#34C759" : palette.subText}
                  />
                  <T weight="regular" color={palette.subText} style={styles.readinessText}>
                    {check.label}
                  </T>
                </View>
              ))}
            </View>
          </SurfaceCard>

          {existingProposal ? (
            <SurfaceCard style={styles.formCard}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Proposal Status
              </T>
              <T weight="regular" color={palette.subText} style={styles.statusText}>
                You already submitted this proposal. Current status: {formatStatus(existingProposal.status)}.
              </T>
              <T weight="regular" color={palette.subText} style={styles.statusText}>
                Submitted on {new Date(existingProposal.created_at).toLocaleDateString()}.
              </T>
            </SurfaceCard>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={submitProposal.isPending || !canSubmit}
            style={[
              styles.submitBtn,
              { backgroundColor: palette.accent, opacity: submitProposal.isPending || !canSubmit ? 0.45 : 1 },
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
  ownerRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  ownerName: {
    fontSize: 12,
    lineHeight: 16,
  },
  ownerMeta: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
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
  errorText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 14,
  },
  helperText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 14,
  },
  metaInlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  presetRow: {
    marginTop: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  presetChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetChipText: {
    fontSize: 11,
    lineHeight: 14,
  },
  readinessList: {
    marginTop: 8,
    gap: 8,
  },
  readinessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readinessText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
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
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
  },
});
