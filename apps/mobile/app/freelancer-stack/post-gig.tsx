import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState, useEffect } from "react";
import { StyleSheet, Switch, TextInput, TouchableOpacity, View, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  FlowScreen,
  FlowTopBar,
  PrimaryButton,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { SP, RADIUS, SHADOWS, SCREEN_PADDING } from "@/components/freelancer/designTokens";
import { gigService, Gig } from "@/lib/gigService";

const experienceOptions = ["junior", "mid", "senior"] as const;

export default function PostGigScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isEditing = !!id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("1200");
  const [budgetMax, setBudgetMax] = useState("2500");
  const [experienceLevel, setExperienceLevel] = useState<(typeof experienceOptions)[number]>("mid");
  const [isRemote, setIsRemote] = useState(true);
  const [location, setLocation] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      const fetchGig = async () => {
        setIsFetching(true);
        try {
          const gig = await gigService.getGig(id);
          setTitle(gig.title || "");
          setDescription(gig.description || "");
          setBudgetMin(String(gig.budget_min ?? 0));
          setBudgetMax(String(gig.budget_max ?? 0));
          setExperienceLevel(gig.experience_level || "mid");
          setIsRemote(gig.is_remote ?? true);
          setLocation(gig.location_text || "");

          if (gig.gig_tags && gig.gig_tags.length > 0) {
            setTagsInput(gig.gig_tags.map(gt => gt.tags?.label).join(", "));
          }
        } catch (error) {
          console.error("Failed to fetch gig for editing:", error);
          Alert.alert("Error", "Could not load the gig details.");
          nav.back();
        } finally {
          setIsFetching(false);
        }
      };
      fetchGig();
    }
  }, [id, isEditing]);

  const budgetError = useMemo(() => {
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (Number.isNaN(min) || Number.isNaN(max)) return "Enter valid numbers for budget.";
    if (min < 0 || max < 0) return "Budget values cannot be negative.";
    if (max < min) return "Maximum budget must be greater than or equal to minimum.";
    return "";
  }, [budgetMin, budgetMax]);

  const canPost = useMemo(() => {
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    return title.trim().length > 0 && description.trim().length > 0 && min >= 0 && max >= min && !budgetError && !isSaving;
  }, [title, description, budgetMin, budgetMax, budgetError, isSaving]);

  const handleSave = async (isDraft = false) => {
    if (!canPost && !isDraft) return;
    try {
      setIsSaving(true);
      const payload: Partial<Gig> & { tags?: string[] } = {
        title: title.trim(),
        description: description.trim(),
        budget_type: "fixed",
        budget_min: Number(budgetMin),
        budget_max: Number(budgetMax),
        experience_level: experienceLevel,
        is_remote: isRemote,
        location_text: location.trim() || undefined,
        status: isDraft ? "draft" : "open",
        tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
      };
      if (isEditing && id) {
        await gigService.updateGig(id, payload);
      } else {
        await gigService.createGig(payload);
      }
      nav.replace("/freelancer-stack/my-gigs");
    } catch (error: any) {
      console.error("Save gig error:", error);
      Alert.alert("Save Failed", error?.message || "Something went wrong while saving the gig.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FlowScreen scroll={false}>
      <FlowTopBar
        title={isEditing ? "Edit Gig" : "Post a Gig"}
        left="arrow-back"
        onLeftPress={() => nav.replace("/freelancer-stack")}
      />

      {isFetching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
          <T color={palette.subText} style={{ marginTop: SP._16 }}>Loading gig details...</T>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* ─── Project Brief ─── */}
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
              <T weight="semiBold" color={palette.subText} style={styles.sectionLabel}>PROJECT BRIEF</T>

              <T weight="bold" color={palette.text} style={styles.fieldLabel}>Gig Title</T>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Senior Product Designer"
                placeholderTextColor={palette.subText}
                style={[styles.input, { backgroundColor: palette.border, color: palette.text }]}
              />

              <T weight="bold" color={palette.text} style={[styles.fieldLabel, { marginTop: SP._16 }]}>Description</T>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                placeholder="Describe your gig requirements..."
                placeholderTextColor={palette.subText}
                style={[styles.textArea, { backgroundColor: palette.border, color: palette.text }]}
              />
            </View>

            {/* ─── Budget ─── */}
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
              <T weight="semiBold" color={palette.subText} style={styles.sectionLabel}>BUDGET</T>
              <View style={styles.budgetRow}>
                <View style={styles.budgetCol}>
                  <T weight="bold" color={palette.text} style={styles.fieldLabel}>Minimum</T>
                  <View style={[styles.budgetInputWrap, { backgroundColor: palette.border }]}>
                    <T weight="semiBold" color={palette.subText} style={styles.currency}>₹</T>
                    <TextInput
                      value={budgetMin}
                      onChangeText={setBudgetMin}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={palette.subText}
                      style={[styles.budgetInput, { color: palette.text }]}
                    />
                  </View>
                </View>
                <View style={styles.budgetCol}>
                  <T weight="bold" color={palette.text} style={styles.fieldLabel}>Maximum</T>
                  <View style={[styles.budgetInputWrap, { backgroundColor: palette.border }]}>
                    <T weight="semiBold" color={palette.subText} style={styles.currency}>₹</T>
                    <TextInput
                      value={budgetMax}
                      onChangeText={setBudgetMax}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={palette.subText}
                      style={[styles.budgetInput, { color: palette.text }]}
                    />
                  </View>
                </View>
              </View>
              {budgetError ? (
                <T weight="medium" color={palette.accent} style={styles.errorText}>{budgetError}</T>
              ) : null}
            </View>

            {/* ─── Requirements ─── */}
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
              <T weight="semiBold" color={palette.subText} style={styles.sectionLabel}>REQUIREMENTS</T>
              <T weight="bold" color={palette.text} style={styles.fieldLabel}>Experience Level</T>
              <View style={styles.chips}>
                {experienceOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.chip,
                      {
                        borderColor: opt === experienceLevel ? palette.accent : palette.border,
                        backgroundColor: opt === experienceLevel ? palette.accentSoft : 'transparent',
                      },
                    ]}
                    onPress={() => setExperienceLevel(opt)}
                    activeOpacity={0.8}
                  >
                    <T
                      weight="semiBold"
                      color={opt === experienceLevel ? palette.accent : palette.subText}
                      style={styles.chipText}
                    >
                      {opt}
                    </T>
                  </TouchableOpacity>
                ))}
              </View>

              <T weight="bold" color={palette.text} style={[styles.fieldLabel, { marginTop: SP._20 }]}>Skills / Tags</T>
              <TextInput
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="e.g. React, Node.js, UI Design"
                placeholderTextColor={palette.subText}
                style={[styles.input, { backgroundColor: palette.border, color: palette.text }]}
              />
              <T weight="medium" color={palette.subText} style={styles.helper}>Comma separated</T>
            </View>

            {/* ─── Location ─── */}
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
              <T weight="semiBold" color={palette.subText} style={styles.sectionLabel}>LOCATION</T>
              <View style={styles.rowBetween}>
                <View>
                  <T weight="bold" color={palette.text} style={styles.fieldLabel}>Remote Friendly</T>
                  <T weight="medium" color={palette.subText} style={styles.helper}>Toggle if location-specific</T>
                </View>
                <Switch value={isRemote} onValueChange={setIsRemote} thumbColor="#fff" trackColor={{ true: palette.accent, false: palette.border }} />
              </View>

              <T weight="bold" color={palette.text} style={[styles.fieldLabel, { marginTop: SP._16 }]}>Location</T>
              <TextInput
                value={location}
                onChangeText={setLocation}
                editable={!isRemote}
                placeholder={isRemote ? "Disabled for remote gigs" : "e.g. Bengaluru, KA"}
                placeholderTextColor={palette.subText}
                style={[styles.input, { backgroundColor: palette.border, color: palette.text, opacity: isRemote ? 0.5 : 1 }]}
              />
            </View>

            {/* ─── Actions ─── */}
            <View style={styles.ctaWrap}>
              <PrimaryButton
                label={isEditing ? "Update Gig" : "Post Gig"}
                icon="send"
                onPress={() => handleSave(false)}
                disabled={!canPost}
                loading={isSaving}
              />
              <T weight="medium" color={palette.subText} style={styles.validation}>
                Title and description are required.
              </T>
            </View>
          </View>
        </ScrollView>
      )}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: SP._32,
  },
  content: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SP._16,
    gap: SP._12,
  },
  card: {
    padding: SP._16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: SP._12,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: SP._8,
  },
  helper: {
    fontSize: 12,
    marginTop: SP._2,
  },
  input: {
    borderRadius: RADIUS.md,
    height: 48,
    paddingHorizontal: SP._16,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  textArea: {
    borderRadius: RADIUS.md,
    minHeight: 110,
    paddingHorizontal: SP._16,
    paddingTop: SP._12,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  budgetRow: {
    flexDirection: "row",
    gap: SP._12,
    marginTop: SP._4,
  },
  budgetCol: {
    flex: 1,
  },
  budgetInputWrap: {
    height: 48,
    borderRadius: RADIUS.md,
    paddingHorizontal: SP._16,
    flexDirection: "row",
    alignItems: "center",
  },
  currency: {
    fontSize: 16,
    marginRight: SP._8,
  },
  budgetInput: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    paddingVertical: 0,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SP._8,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SP._16,
    paddingVertical: SP._8,
  },
  chipText: {
    fontSize: 13,
    textTransform: "capitalize",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ctaWrap: {
    marginTop: SP._8,
    marginBottom: SP._24,
    gap: SP._8,
    position: "relative",
  },
  errorText: {
    fontSize: 12,
    marginTop: SP._8,
  },
  validation: {
    fontSize: 12,
    textAlign: "center",
    marginTop: SP._4,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -10,
    marginLeft: -10,
    zIndex: 10,
  },
});
