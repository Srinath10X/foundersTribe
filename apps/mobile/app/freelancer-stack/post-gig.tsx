import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  Avatar,
  FlowScreen,
  PrimaryButton,
  SurfaceCard,
  T,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useAuth } from "@/context/AuthContext";
import { useContracts, useCreateGig, useGig, useMyProfile, useUpdateGig } from "@/hooks/useGig";
import * as tribeApi from "@/lib/tribeApi";
import {
  composeGigDescription,
  formatTimeline,
  parseGigDescription,
  type TimelineUnit,
} from "@/lib/gigContent";
import type { GigCreateInput, GigUpdateInput } from "@/types/gig";

const experienceOptions = ["junior", "mid", "senior"] as const;
const timelineUnits: TimelineUnit[] = ["days", "weeks"];
const skillSuggestions = [
  "React",
  "React Native",
  "Node.js",
  "TypeScript",
  "JavaScript",
  "UI Design",
  "UX Research",
  "Figma",
  "Product Design",
  "Branding",
  "Video Editing",
  "Motion Graphics",
  "Copywriting",
  "SEO",
  "Content Strategy",
  "Python",
  "Django",
  "Flask",
  "PostgreSQL",
  "MongoDB",
  "AWS",
  "DevOps",
  "Docker",
  "Kubernetes",
  "Data Analysis",
  "Prompt Engineering",
  "AI/ML",
  "Marketing",
  "Sales",
  "Finance",
];

export default function PostGigScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const { data: existingGig, isLoading: isFetching } = useGig(id);
  const { data: contractsData } = useContracts({ limit: 100 });
  const { data: myProfile } = useMyProfile();
  const createGigMutation = useCreateGig();
  const updateGigMutation = useUpdateGig();

  const [title, setTitle] = useState("");
  const [projectOverview, setProjectOverview] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [timelineValue, setTimelineValue] = useState("2");
  const [timelineUnit, setTimelineUnit] = useState<TimelineUnit>("weeks");
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>(["", ""]);
  const [budgetMax, setBudgetMax] = useState("2500");
  const [experienceLevel, setExperienceLevel] = useState<(typeof experienceOptions)[number]>("mid");
  const [isRemote, setIsRemote] = useState(true);
  const [location, setLocation] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [formInitialized, setFormInitialized] = useState(!isEditing);
  const [tribeProfile, setTribeProfile] = useState<any>(null);

  const isSaving = createGigMutation.isPending || updateGigMutation.isPending;

  const linkedContract = useMemo(
    () => (contractsData?.items ?? []).find((contract) => contract.gig_id === id) || null,
    [contractsData?.items, id],
  );
  const isLockedForEdit = isEditing && !!linkedContract;

  useEffect(() => {
    if (isEditing && existingGig && !formInitialized) {
      const parsed = parseGigDescription(existingGig.description || "");

      setTitle(existingGig.title || "");
      setProjectOverview(parsed.projectOverview || "");
      setDeliverables(parsed.deliverables.length > 0 ? parsed.deliverables : [""]);
      setTimelineValue(parsed.timelineValue ? String(parsed.timelineValue) : "2");
      setTimelineUnit(parsed.timelineUnit || "weeks");
      setScreeningQuestions(
        parsed.screeningQuestions.length >= 2
          ? parsed.screeningQuestions.slice(0, 3)
          : [parsed.screeningQuestions[0] || "", parsed.screeningQuestions[1] || ""],
      );
      setBudgetMax(String(existingGig.budget_max ?? existingGig.budget_min ?? 0));
      setExperienceLevel(existingGig.experience_level || "mid");
      setIsRemote(existingGig.is_remote ?? true);
      setLocation(existingGig.location_text || "");
      setSelectedSkills(
        existingGig.gig_tags?.map((gt) => gt.tags?.label).filter((x): x is string => Boolean(x)) || [],
      );

      setFormInitialized(true);
    }
  }, [existingGig, formInitialized, isEditing]);

  useEffect(() => {
    let cancelled = false;
    const loadTribeProfile = async () => {
      if (!session?.access_token) return;
      try {
        const profile = await tribeApi.getMyProfile(session.access_token);
        if (!cancelled) setTribeProfile(profile);
      } catch {
        if (!cancelled) setTribeProfile(null);
      }
    };
    loadTribeProfile();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const skillAutocomplete = useMemo(() => {
    const query = skillInput.trim().toLowerCase();
    if (!query) return [];
    return skillSuggestions
      .filter((skill) => !selectedSkills.some((s) => s.toLowerCase() === skill.toLowerCase()))
      .filter((skill) => skill.toLowerCase().includes(query))
      .slice(0, 6);
  }, [selectedSkills, skillInput]);

  const normalizedDeliverables = useMemo(
    () => deliverables.map((item) => item.trim()).filter(Boolean),
    [deliverables],
  );

  const normalizedQuestions = useMemo(
    () => screeningQuestions.map((item) => item.trim()).filter(Boolean),
    [screeningQuestions],
  );

  const budgetError = useMemo(() => {
    const max = Number(budgetMax);
    if (Number.isNaN(max)) return "Enter a valid number for max budget.";
    if (max <= 0) return "Max budget must be greater than zero.";
    return "";
  }, [budgetMax]);

  const timelineError = useMemo(() => {
    const value = Number(timelineValue);
    if (Number.isNaN(value)) return "Timeline must be a valid number.";
    if (value <= 0) return "Timeline must be greater than zero.";
    if (timelineUnit === "weeks" && value > 52) return "Timeline cannot exceed 52 weeks.";
    if (timelineUnit === "days" && value > 365) return "Timeline cannot exceed 365 days.";
    return "";
  }, [timelineUnit, timelineValue]);

  const screeningError = useMemo(() => {
    if (normalizedQuestions.length < 2) return "Add at least 2 screening questions.";
    if (normalizedQuestions.length > 3) return "Maximum 3 screening questions allowed.";
    return "";
  }, [normalizedQuestions.length]);

  const completenessError = useMemo(() => {
    if (title.trim().length < 10) return "Title should be at least 10 characters.";
    if (projectOverview.trim().length < 30) return "Project overview should be at least 30 characters.";
    if (normalizedDeliverables.length < 1) return "Add at least one deliverable.";
    if (selectedSkills.length < 1) return "Add at least one required skill.";
    if (budgetError) return budgetError;
    if (timelineError) return timelineError;
    if (screeningError) return screeningError;
    if (isLockedForEdit) return "This gig has an accepted proposal and can no longer be edited.";
    return "";
  }, [
    budgetError,
    isLockedForEdit,
    normalizedDeliverables.length,
    projectOverview,
    screeningError,
    selectedSkills.length,
    timelineError,
    title,
  ]);

  const canPost = !isSaving && !completenessError;
  const previewPosterName =
    String(tribeProfile?.display_name || "").trim() ||
    myProfile?.full_name ||
    String(session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || "").trim() ||
    (session?.user?.email ? session.user.email.split("@")[0] : "") ||
    "You";
  const previewPosterHandle =
    String(tribeProfile?.username || "").trim() ||
    myProfile?.handle ||
    String(session?.user?.user_metadata?.user_name || session?.user?.user_metadata?.preferred_username || "").trim() ||
    "";
  const previewPosterAvatar =
    String(tribeProfile?.photo_url || tribeProfile?.avatar_url || "").trim() ||
    myProfile?.avatar_url ||
    String(session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || "").trim() ||
    undefined;

  const parsedTimelineValue = Number(timelineValue);
  const previewDescription = composeGigDescription({
    projectOverview,
    deliverables: normalizedDeliverables,
    screeningQuestions: normalizedQuestions,
    timelineValue: Number.isNaN(parsedTimelineValue) ? null : parsedTimelineValue,
    timelineUnit,
  });
  const previewParsed = parseGigDescription(previewDescription);

  const addSkill = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    if (selectedSkills.some((x) => x.toLowerCase() === next.toLowerCase())) return;
    if (selectedSkills.length >= 10) return;
    setSelectedSkills((prev) => [...prev, next]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((x) => x !== skill));
  };

  const setDeliverableAt = (index: number, value: string) => {
    setDeliverables((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const removeDeliverableAt = (index: number) => {
    setDeliverables((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  const addDeliverable = () => {
    if (deliverables.length >= 8) return;
    setDeliverables((prev) => [...prev, ""]);
  };

  const setQuestionAt = (index: number, value: string) => {
    setScreeningQuestions((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const removeQuestionAt = (index: number) => {
    setScreeningQuestions((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const addQuestion = () => {
    if (screeningQuestions.length >= 3) return;
    setScreeningQuestions((prev) => [...prev, ""]);
  };

  const handleSave = async (isDraft = false) => {
    if (!canPost && !isDraft) {
      Alert.alert("Incomplete Form", completenessError || "Please complete the required fields.");
      return;
    }

    if (isLockedForEdit) {
      Alert.alert("Gig Locked", "This gig already has an accepted proposal and cannot be edited.");
      return;
    }

    try {
      const parsedBudgetMax = Number(budgetMax);
      const parsedTimeline = Number(timelineValue);
      const description = composeGigDescription({
        projectOverview,
        deliverables: normalizedDeliverables,
        screeningQuestions: normalizedQuestions,
        timelineValue: Number.isNaN(parsedTimeline) ? null : parsedTimeline,
        timelineUnit,
      });

      if (isEditing && id) {
        const payload: GigUpdateInput & { tags?: string[] } = {
          title: title.trim(),
          description,
          budget_type: "fixed",
          budget_min: parsedBudgetMax,
          budget_max: parsedBudgetMax,
          experience_level: experienceLevel,
          is_remote: isRemote,
          location_text: location.trim() || undefined,
          status: isDraft ? "draft" : "open",
          tags: selectedSkills,
        };
        await updateGigMutation.mutateAsync({ id, data: payload });
      } else {
        const payload: GigCreateInput & { tags?: string[] } = {
          title: title.trim(),
          description,
          budget_type: "fixed",
          budget_min: parsedBudgetMax,
          budget_max: parsedBudgetMax,
          experience_level: experienceLevel,
          is_remote: isRemote,
          location_text: location.trim() || undefined,
          status: isDraft ? "draft" : "open",
          tags: selectedSkills,
        };
        await createGigMutation.mutateAsync(payload);
      }

      router.replace("/freelancer-stack/my-gigs");
    } catch (error: any) {
      console.error("Save gig error:", error);
      Alert.alert("Save Failed", error?.message || "Something went wrong while saving the gig.");
    }
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
          onPress={() => router.replace("/freelancer-stack")}
        >
          <Ionicons name="arrow-back" size={15} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>
            {isEditing ? "Edit Gig" : "Post a Gig"}
          </T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
            Add complete requirements before publishing
          </T>
        </View>
      </View>

      {isFetching ? (
        <View style={styles.loadingWrap}>
          <LoadingState rows={5} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {isLockedForEdit ? (
              <SurfaceCard style={styles.lockCard}>
                <View style={styles.lockHead}>
                  <Ionicons name="lock-closed-outline" size={16} color={palette.accent} />
                  <T weight="medium" color={palette.text} style={styles.lockTitle}>
                    Editing Locked
                  </T>
                </View>
                <T weight="regular" color={palette.subText} style={styles.lockText}>
                  A proposal has already been accepted for this gig. Mutable fields are disabled to protect active contract terms.
                </T>
              </SurfaceCard>
            ) : null}

            <SurfaceCard style={styles.card}>
              <T weight="regular" color={palette.subText} style={styles.sectionLabel}>
                Project Brief
              </T>

              <T weight="medium" color={palette.text} style={styles.fieldLabel}>
                Gig Title
              </T>
              <TextInput
                value={title}
                onChangeText={setTitle}
                editable={!isLockedForEdit}
                placeholder="e.g. Senior Product Designer"
                placeholderTextColor={palette.subText}
                style={[
                  styles.input,
                  { backgroundColor: palette.border, color: palette.text, opacity: isLockedForEdit ? 0.55 : 1 },
                ]}
              />

              <T weight="medium" color={palette.text} style={[styles.fieldLabel, styles.mt12]}>
                Project Overview
              </T>
              <TextInput
                value={projectOverview}
                onChangeText={setProjectOverview}
                multiline
                editable={!isLockedForEdit}
                textAlignVertical="top"
                placeholder="Explain the project scope, goals, and context"
                placeholderTextColor={palette.subText}
                style={[
                  styles.textArea,
                  { backgroundColor: palette.border, color: palette.text, opacity: isLockedForEdit ? 0.55 : 1 },
                ]}
              />

              <T weight="medium" color={palette.text} style={[styles.fieldLabel, styles.mt12]}>
                Experience Level
              </T>
              <View style={styles.chips}>
                {experienceOptions.map((opt) => {
                  const active = opt === experienceLevel;
                  return (
                    <TouchableOpacity
                      key={opt}
                      disabled={isLockedForEdit}
                      onPress={() => setExperienceLevel(opt)}
                      activeOpacity={0.8}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? palette.accent : palette.borderLight,
                          backgroundColor: active ? palette.accentSoft : "transparent",
                          opacity: isLockedForEdit ? 0.55 : 1,
                        },
                      ]}
                    >
                      <T weight="regular" color={active ? palette.accent : palette.subText} style={styles.chipText}>
                        {opt}
                      </T>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </SurfaceCard>

            <SurfaceCard style={styles.card}>
              <View style={styles.listHeader}>
                <T weight="regular" color={palette.subText} style={styles.sectionLabel}>
                  Deliverables
                </T>
                <TouchableOpacity
                  disabled={isLockedForEdit || deliverables.length >= 8}
                  onPress={addDeliverable}
                  style={[styles.inlineBtn, { opacity: isLockedForEdit ? 0.5 : 1 }]}
                >
                  <Ionicons name="add" size={14} color={palette.accent} />
                  <T weight="medium" color={palette.accent} style={styles.inlineBtnText}>
                    Add Deliverable
                  </T>
                </TouchableOpacity>
              </View>

              {deliverables.map((item, index) => (
                <View key={`deliverable-${index}`} style={styles.listItemRow}>
                  <TextInput
                    value={item}
                    onChangeText={(value) => setDeliverableAt(index, value)}
                    editable={!isLockedForEdit}
                    placeholder={`Deliverable ${index + 1}`}
                    placeholderTextColor={palette.subText}
                    style={[
                      styles.input,
                      styles.flexInput,
                      { backgroundColor: palette.border, color: palette.text, opacity: isLockedForEdit ? 0.55 : 1 },
                    ]}
                  />
                  <TouchableOpacity
                    disabled={isLockedForEdit || deliverables.length <= 1}
                    onPress={() => removeDeliverableAt(index)}
                    style={[styles.iconAction, { borderColor: palette.borderLight, opacity: isLockedForEdit ? 0.5 : 1 }]}
                  >
                    <Ionicons name="trash-outline" size={14} color={palette.subText} />
                  </TouchableOpacity>
                </View>
              ))}
            </SurfaceCard>

            <SurfaceCard style={styles.card}>
              <T weight="regular" color={palette.subText} style={styles.sectionLabel}>
                Budget & Timeline
              </T>

              <T weight="medium" color={palette.text} style={styles.fieldLabel}>
                Max Budget
              </T>
              <View style={[styles.amountWrap, { backgroundColor: palette.border, opacity: isLockedForEdit ? 0.55 : 1 }]}> 
                <T weight="regular" color={palette.subText} style={styles.currency}>INR</T>
                <TextInput
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                  editable={!isLockedForEdit}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={palette.subText}
                  style={[styles.amountInput, { color: palette.text }]}
                />
              </View>
              {budgetError ? (
                <T weight="regular" color={palette.accent} style={styles.errorText}>
                  {budgetError}
                </T>
              ) : null}

              <T weight="medium" color={palette.text} style={[styles.fieldLabel, styles.mt12]}>
                Timeline
              </T>
              <View style={styles.timelineRow}>
                <View style={[styles.amountWrap, styles.timelineInputWrap, { backgroundColor: palette.border, opacity: isLockedForEdit ? 0.55 : 1 }]}> 
                  <TextInput
                    value={timelineValue}
                    onChangeText={setTimelineValue}
                    editable={!isLockedForEdit}
                    keyboardType="numeric"
                    placeholder="2"
                    placeholderTextColor={palette.subText}
                    style={[styles.amountInput, { color: palette.text }]}
                  />
                </View>
                <View style={styles.unitWrap}>
                  {timelineUnits.map((unit) => {
                    const active = timelineUnit === unit;
                    return (
                      <TouchableOpacity
                        key={unit}
                        disabled={isLockedForEdit}
                        onPress={() => setTimelineUnit(unit)}
                        style={[
                          styles.unitChip,
                          {
                            borderColor: active ? palette.accent : palette.borderLight,
                            backgroundColor: active ? palette.accentSoft : "transparent",
                            opacity: isLockedForEdit ? 0.55 : 1,
                          },
                        ]}
                      >
                        <T weight="regular" color={active ? palette.accent : palette.subText} style={styles.unitText}>
                          {unit}
                        </T>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {timelineError ? (
                <T weight="regular" color={palette.accent} style={styles.errorText}>
                  {timelineError}
                </T>
              ) : null}
            </SurfaceCard>

            <SurfaceCard style={styles.card}>
              <T weight="regular" color={palette.subText} style={styles.sectionLabel}>
                Required Skills
              </T>

              <View style={styles.skillInputRow}>
                <TextInput
                  value={skillInput}
                  onChangeText={setSkillInput}
                  editable={!isLockedForEdit}
                  placeholder="Type skill and press add"
                  placeholderTextColor={palette.subText}
                  style={[
                    styles.input,
                    styles.flexInput,
                    { backgroundColor: palette.border, color: palette.text, opacity: isLockedForEdit ? 0.55 : 1 },
                  ]}
                  onSubmitEditing={() => addSkill(skillInput)}
                />
                <TouchableOpacity
                  disabled={isLockedForEdit}
                  onPress={() => addSkill(skillInput)}
                  style={[styles.addSkillBtn, { backgroundColor: palette.accent, opacity: isLockedForEdit ? 0.5 : 1 }]}
                >
                  <T weight="medium" color="#fff" style={styles.addSkillText}>Add</T>
                </TouchableOpacity>
              </View>

              {skillAutocomplete.length > 0 && !isLockedForEdit ? (
                <View style={styles.suggestionWrap}>
                  {skillAutocomplete.map((skill) => (
                    <TouchableOpacity
                      key={skill}
                      onPress={() => addSkill(skill)}
                      style={[styles.suggestionChip, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
                    >
                      <T weight="regular" color={palette.subText} style={styles.suggestionText}>
                        {skill}
                      </T>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <View style={styles.skillsWrap}>
                {selectedSkills.map((skill) => (
                  <View key={skill} style={[styles.skillTag, { backgroundColor: palette.border }]}> 
                    <T weight="regular" color={palette.text} style={styles.skillText}>{skill}</T>
                    {!isLockedForEdit ? (
                      <TouchableOpacity onPress={() => removeSkill(skill)}>
                        <Ionicons name="close" size={12} color={palette.subText} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            </SurfaceCard>

            <SurfaceCard style={styles.card}>
              <View style={styles.listHeader}>
                <T weight="regular" color={palette.subText} style={styles.sectionLabel}>
                  Screening Questions
                </T>
                <TouchableOpacity
                  disabled={isLockedForEdit || screeningQuestions.length >= 3}
                  onPress={addQuestion}
                  style={[styles.inlineBtn, { opacity: isLockedForEdit ? 0.5 : 1 }]}
                >
                  <Ionicons name="add" size={14} color={palette.accent} />
                  <T weight="medium" color={palette.accent} style={styles.inlineBtnText}>
                    Add Question
                  </T>
                </TouchableOpacity>
              </View>

              {screeningQuestions.map((item, index) => (
                <View key={`question-${index}`} style={styles.listItemRow}>
                  <TextInput
                    value={item}
                    onChangeText={(value) => setQuestionAt(index, value)}
                    editable={!isLockedForEdit}
                    placeholder={`Question ${index + 1}`}
                    placeholderTextColor={palette.subText}
                    style={[
                      styles.input,
                      styles.flexInput,
                      { backgroundColor: palette.border, color: palette.text, opacity: isLockedForEdit ? 0.55 : 1 },
                    ]}
                  />
                  <TouchableOpacity
                    disabled={isLockedForEdit || screeningQuestions.length <= 2}
                    onPress={() => removeQuestionAt(index)}
                    style={[styles.iconAction, { borderColor: palette.borderLight, opacity: isLockedForEdit ? 0.5 : 1 }]}
                  >
                    <Ionicons name="trash-outline" size={14} color={palette.subText} />
                  </TouchableOpacity>
                </View>
              ))}

              {screeningError ? (
                <T weight="regular" color={palette.accent} style={styles.errorText}>
                  {screeningError}
                </T>
              ) : null}
            </SurfaceCard>

            <SurfaceCard style={styles.card}>
              <T weight="regular" color={palette.subText} style={styles.sectionLabel}>
                Location
              </T>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <T weight="medium" color={palette.text} style={styles.fieldLabel}>
                    Remote Friendly
                  </T>
                  <T weight="regular" color={palette.subText} style={styles.helper}>
                    Toggle off if location-specific
                  </T>
                </View>
                <Switch
                  value={isRemote}
                  onValueChange={setIsRemote}
                  disabled={isLockedForEdit}
                  thumbColor="#fff"
                  trackColor={{ true: palette.accent, false: palette.border }}
                />
              </View>

              <T weight="medium" color={palette.text} style={[styles.fieldLabel, styles.mt12]}>
                Location
              </T>
              <TextInput
                value={location}
                onChangeText={setLocation}
                editable={!isRemote && !isLockedForEdit}
                placeholder={isRemote ? "Disabled for remote gigs" : "e.g. Bengaluru, KA"}
                placeholderTextColor={palette.subText}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.border,
                    color: palette.text,
                    opacity: isRemote || isLockedForEdit ? 0.55 : 1,
                  },
                ]}
              />
            </SurfaceCard>

            <View style={styles.previewToggleRow}>
              <TouchableOpacity
                onPress={() => setShowPreview((prev) => !prev)}
                style={[styles.previewBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
              >
                <Ionicons name={showPreview ? "eye-off-outline" : "eye-outline"} size={14} color={palette.text} />
                <T weight="medium" color={palette.text} style={styles.previewBtnText}>
                  {showPreview ? "Hide Preview" : "Preview Gig"}
                </T>
              </TouchableOpacity>
            </View>

            {showPreview ? (
              <SurfaceCard style={styles.previewCard}>
                <LinearGradient
                  colors={[palette.accentSoft, palette.surface]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.previewHero, { borderColor: palette.borderLight }]}
                >
                  <View style={styles.previewTopMeta}>
                    <View style={[styles.previewStatusPill, { backgroundColor: palette.surface }]}>
                      <T weight="medium" color={palette.accent} style={styles.previewStatusText}>
                        Open
                      </T>
                    </View>
                    <View style={[styles.previewStatusPill, { backgroundColor: palette.surface }]}>
                      <T weight="regular" color={palette.subText} style={styles.previewStatusText}>
                        {experienceLevel}
                      </T>
                    </View>
                  </View>
                  <T weight="medium" color={palette.text} style={styles.previewTitle}>
                    {title.trim() || "Gig Title"}
                  </T>
                  <T weight="regular" color={palette.subText} style={styles.previewMeta}>
                    Founder listing preview
                  </T>

                  <View style={styles.previewDetailList}>
                    <View style={styles.previewDetailRow}>
                      <Ionicons name="cash-outline" size={13} color={palette.subText} />
                      <T weight="regular" color={palette.subText} style={styles.previewDetailText}>
                        INR {Number(budgetMax || 0).toLocaleString()}
                      </T>
                    </View>
                    <View style={styles.previewDetailRow}>
                      <Ionicons name="time-outline" size={13} color={palette.subText} />
                      <T weight="regular" color={palette.subText} style={styles.previewDetailText}>
                        {formatTimeline(Number(timelineValue) || null, timelineUnit)}
                      </T>
                    </View>
                    <View style={styles.previewDetailRow}>
                      <Ionicons name={isRemote ? "globe-outline" : "location-outline"} size={13} color={palette.subText} />
                      <T weight="regular" color={palette.subText} style={styles.previewDetailText}>
                        {isRemote ? "Remote" : location.trim() || "On-site"}
                      </T>
                    </View>
                  </View>
                </LinearGradient>

                <View style={styles.previewMetricRow}>
                  <View style={[styles.previewMetricCard, { backgroundColor: palette.borderLight }]}>
                    <T weight="regular" color={palette.subText} style={styles.previewMetricLabel}>
                      Max Budget
                    </T>
                    <T weight="medium" color={palette.text} style={styles.previewMetricValue}>
                      INR {Number(budgetMax || 0).toLocaleString()}
                    </T>
                  </View>
                  <View style={[styles.previewMetricCard, { backgroundColor: palette.borderLight }]}>
                    <T weight="regular" color={palette.subText} style={styles.previewMetricLabel}>
                      Deliverables
                    </T>
                    <T weight="medium" color={palette.text} style={styles.previewMetricValue}>
                      {previewParsed.deliverables.length || 0}
                    </T>
                  </View>
                </View>

                <View style={[styles.previewOwnerCard, { borderColor: palette.borderLight }]}>
                  <T weight="regular" color={palette.subText} style={styles.previewOwnerLabel}>
                    Posted by
                  </T>
                  <View style={styles.previewOwnerRow}>
                    <Avatar source={previewPosterAvatar} size={38} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T weight="medium" color={palette.text} style={styles.previewOwnerName} numberOfLines={1}>
                        {previewPosterName}
                      </T>
                      <T weight="regular" color={palette.subText} style={styles.previewOwnerMeta} numberOfLines={1}>
                        {previewPosterHandle ? `@${previewPosterHandle}` : "Founder"}
                      </T>
                    </View>
                  </View>
                </View>

                <View style={[styles.previewBlock, { borderColor: palette.borderLight }]}>
                  <View style={styles.previewSectionHead}>
                    <Ionicons name="document-text-outline" size={13} color={palette.subText} />
                    <T weight="medium" color={palette.text} style={styles.previewSectionTitle}>
                      Project Overview
                    </T>
                  </View>
                  <T weight="regular" color={palette.subText} style={styles.previewBody}>
                    {previewParsed.projectOverview || "No project overview provided."}
                  </T>
                </View>

                <View style={[styles.previewBlock, { borderColor: palette.borderLight }]}>
                  <View style={styles.previewSectionHead}>
                    <Ionicons name="checkmark-done-outline" size={13} color={palette.subText} />
                    <T weight="medium" color={palette.text} style={styles.previewSectionTitle}>
                      Deliverables
                    </T>
                  </View>
                  {previewParsed.deliverables.length > 0 ? (
                    previewParsed.deliverables.map((item, index) => (
                      <T key={`preview-deliverable-${index}`} weight="regular" color={palette.subText} style={styles.previewBullet}>
                        {index + 1}. {item}
                      </T>
                    ))
                  ) : (
                    <T weight="regular" color={palette.subText} style={styles.previewBody}>
                      No deliverables specified.
                    </T>
                  )}
                </View>

                <View style={[styles.previewBlock, { borderColor: palette.borderLight }]}>
                  <View style={styles.previewSectionHead}>
                    <Ionicons name="construct-outline" size={13} color={palette.subText} />
                    <T weight="medium" color={palette.text} style={styles.previewSectionTitle}>
                      Skills Needed
                    </T>
                  </View>
                  <View style={styles.previewSkillsWrap}>
                    {selectedSkills.length === 0 ? (
                      <T weight="regular" color={palette.subText} style={styles.previewBody}>
                        No skills selected.
                      </T>
                    ) : (
                      selectedSkills.map((skill) => (
                        <View key={`preview-skill-${skill}`} style={[styles.previewSkillTag, { backgroundColor: palette.borderLight }]}> 
                          <T weight="regular" color={palette.subText} style={styles.previewSkillText}>
                            {skill}
                          </T>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                <View style={[styles.previewBlock, { borderColor: palette.borderLight }]}>
                  <View style={styles.previewSectionHead}>
                    <Ionicons name="help-circle-outline" size={13} color={palette.subText} />
                    <T weight="medium" color={palette.text} style={styles.previewSectionTitle}>
                      Screening Questions
                    </T>
                  </View>
                  {previewParsed.screeningQuestions.length > 0 ? (
                    previewParsed.screeningQuestions.map((item, index) => (
                      <T key={`preview-q-${index}`} weight="regular" color={palette.subText} style={styles.previewBullet}>
                        Q{index + 1}. {item}
                      </T>
                    ))
                  ) : (
                    <T weight="regular" color={palette.subText} style={styles.previewBody}>
                      No screening questions added.
                    </T>
                  )}
                </View>

              </SurfaceCard>
            ) : null}

            <View style={styles.ctaWrap}>
              <PrimaryButton
                label={isEditing ? "Update Gig" : "Post Gig"}
                icon="send"
                onPress={() => handleSave(false)}
                disabled={!canPost}
                loading={isSaving}
              />
              <T weight="regular" color={completenessError ? palette.accent : palette.subText} style={styles.validationHint}>
                {completenessError || "Ready to publish."}
              </T>
            </View>
          </View>
        </ScrollView>
      )}
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
  pageTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  loadingWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
  },
  lockCard: {
    padding: 12,
  },
  lockHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lockTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  lockText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
  },
  card: {
    padding: 12,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  input: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  textArea: {
    minHeight: 96,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  mt12: {
    marginTop: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: "capitalize",
  },
  amountWrap: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  currency: {
    fontSize: 11,
    lineHeight: 14,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
    paddingVertical: 0,
  },
  errorText: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 14,
  },
  helper: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  inlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  inlineBtnText: {
    fontSize: 11,
    lineHeight: 14,
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  flexInput: {
    flex: 1,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineInputWrap: {
    flex: 1,
  },
  unitWrap: {
    flexDirection: "row",
    gap: 6,
  },
  unitChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  unitText: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: "capitalize",
  },
  skillInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addSkillBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addSkillText: {
    fontSize: 11,
    lineHeight: 14,
  },
  suggestionWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  suggestionText: {
    fontSize: 10,
    lineHeight: 13,
  },
  skillsWrap: {
    marginTop: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skillTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  skillText: {
    fontSize: 10,
    lineHeight: 13,
  },
  previewToggleRow: {
    marginTop: 2,
  },
  previewBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  previewBtnText: {
    fontSize: 12,
    lineHeight: 16,
  },
  previewCard: {
    padding: 12,
    gap: 10,
  },
  previewHero: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  previewTopMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  previewStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  previewStatusText: {
    fontSize: 10,
    lineHeight: 13,
    textTransform: "capitalize",
  },
  previewTitle: {
    fontSize: 16,
    lineHeight: 21,
  },
  previewMeta: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
  },
  previewDetailList: {
    marginTop: 10,
    gap: 6,
  },
  previewDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewDetailText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  previewMetricRow: {
    flexDirection: "row",
    gap: 8,
  },
  previewMetricCard: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  previewMetricLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  previewMetricValue: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  previewOwnerCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  previewOwnerLabel: {
    fontSize: 10,
    lineHeight: 13,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewOwnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewOwnerName: {
    fontSize: 12,
    lineHeight: 16,
  },
  previewOwnerMeta: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  previewBlock: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  previewSectionTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  previewSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewBody: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
  },
  previewBullet: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
  },
  previewSkillsWrap: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  previewSkillTag: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  previewSkillText: {
    fontSize: 10,
    lineHeight: 13,
  },
  ctaWrap: {
    marginTop: 4,
    gap: 6,
  },
  validationHint: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
  },
});
