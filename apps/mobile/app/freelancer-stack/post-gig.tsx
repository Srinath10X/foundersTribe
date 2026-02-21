import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState, useEffect } from "react";
import { StyleSheet, Switch, TextInput, TouchableOpacity, View, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  FlowScreen,
  FlowTopBar,
  GhostButton,
  PrimaryButton,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { gigService, Gig } from "@/lib/gigService";

const experienceOptions = ["junior", "mid", "senior"] as const;
const stageOptions = ["idea", "mvp", "revenue", "funded"] as const;
const statusOptions = ["draft", "open"] as const;

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
  const [startupStage, setStartupStage] = useState<(typeof stageOptions)[number]>("mvp");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("open");
  const [isRemote, setIsRemote] = useState(true);
  const [location, setLocation] = useState("");

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
          setBudgetMax((gig.budget || 2500).toString());
          if (gig.status === "open" || gig.status === "draft") {
            setStatus(gig.status as any); // Assuming gig has these valid statuses, fallback to open if not
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
    return title.trim().length >= 10 && description.trim().length >= 30 && min >= 0 && max >= min && !budgetError && !isSaving;
  }, [title, description, budgetMin, budgetMax, budgetError, isSaving]);

  const handleSave = async (isDraft = false) => {
    if (!canPost && !isDraft) return;

    try {
      setIsSaving(true);

      const payload: Partial<Gig> = {
        title: title.trim(),
        description: description.trim(),
        budget_type: "fixed",
        budget_min: Number(budgetMin),
        budget_max: Number(budgetMax),
        budget: Number(budgetMax),
        experience_level: experienceLevel,
        startup_stage: startupStage,
        is_remote: isRemote,
        location_text: location.trim() || undefined,
        status: isDraft ? "draft" : (status as Gig["status"]),
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
    <FlowScreen>
      <FlowTopBar
        title={isEditing ? "Edit Gig" : "Post a Gig"}
        left="arrow-back"
        onLeftPress={() => nav.replace("/freelancer-stack")}
      />

      {isFetching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
          <T color={palette.subText} style={{ marginTop: 16 }}>Loading gig details...</T>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <SurfaceCard style={styles.card}>
              <T weight="semiBold" color={palette.subText} style={styles.metaLabel}>PROJECT BRIEF</T>

              <T weight="bold" color={palette.text} style={styles.label}>Gig Title</T>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Senior Product Designer"
                placeholderTextColor={palette.subText}
                style={[styles.input, { backgroundColor: palette.border, color: palette.text }]}
              />

              <T weight="bold" color={palette.text} style={[styles.label, { marginTop: 12 }]}>Description</T>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                placeholder="Minimum 30 characters"
                placeholderTextColor={palette.subText}
                style={[styles.textArea, { backgroundColor: palette.border, color: palette.text }]}
              />
            </SurfaceCard>

            <SurfaceCard style={styles.card}>
              <T weight="semiBold" color={palette.subText} style={styles.metaLabel}>BUDGET</T>

              <View style={styles.budgetRow}>
                <View style={styles.budgetCol}>
                  <T weight="bold" color={palette.text} style={styles.label}>Minimum</T>
                  <View style={[styles.budgetInputWrap, { backgroundColor: palette.border }]}>
                    <T weight="semiBold" color={palette.subText} style={styles.currency}>$</T>
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
                  <T weight="bold" color={palette.text} style={styles.label}>Maximum</T>
                  <View style={[styles.budgetInputWrap, { backgroundColor: palette.border }]}>
                    <T weight="semiBold" color={palette.subText} style={styles.currency}>$</T>
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
                <T weight="medium" color={palette.accent} style={styles.errorText}>
                  {budgetError}
                </T>
              ) : null}
            </SurfaceCard>

            <SurfaceCard style={styles.card}>
              <T weight="semiBold" color={palette.subText} style={styles.metaLabel}>REQUIREMENTS</T>
              <T weight="bold" color={palette.text} style={styles.label}>Experience Level</T>
              <View style={styles.chips}>
                {experienceOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, { borderColor: opt === experienceLevel ? palette.accent : palette.border, backgroundColor: opt === experienceLevel ? palette.accentSoft : palette.surface }]}
                    onPress={() => setExperienceLevel(opt)}
                  >
                    <T weight="semiBold" color={opt === experienceLevel ? palette.accent : palette.subText} style={styles.chipText}>{opt}</T>
                  </TouchableOpacity>
                ))}
              </View>

              <T weight="bold" color={palette.text} style={[styles.label, { marginTop: 12 }]}>Startup Stage</T>
              <View style={styles.chips}>
                {stageOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, { borderColor: opt === startupStage ? palette.accent : palette.border, backgroundColor: opt === startupStage ? palette.accentSoft : palette.surface }]}
                    onPress={() => setStartupStage(opt)}
                  >
                    <T weight="semiBold" color={opt === startupStage ? palette.accent : palette.subText} style={styles.chipText}>{opt}</T>
                  </TouchableOpacity>
                ))}
              </View>

              <T weight="bold" color={palette.text} style={[styles.label, { marginTop: 12 }]}>Listing Status</T>
              <View style={styles.chips}>
                {statusOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, { borderColor: opt === status ? palette.accent : palette.border, backgroundColor: opt === status ? palette.accentSoft : palette.surface }]}
                    onPress={() => setStatus(opt)}
                  >
                    <T weight="semiBold" color={opt === status ? palette.accent : palette.subText} style={styles.chipText}>{opt}</T>
                  </TouchableOpacity>
                ))}
              </View>
            </SurfaceCard>

            <SurfaceCard style={styles.card}>
              <T weight="semiBold" color={palette.subText} style={styles.metaLabel}>LOCATION</T>
              <View style={styles.rowBetween}>
                <View>
                  <T weight="bold" color={palette.text} style={styles.label}>Remote Friendly</T>
                  <T weight="medium" color={palette.subText} style={styles.helper}>Toggle if location-specific</T>
                </View>
                <Switch value={isRemote} onValueChange={setIsRemote} thumbColor="#fff" trackColor={{ true: palette.accent, false: palette.border }} />
              </View>

              <T weight="bold" color={palette.text} style={[styles.label, { marginTop: 12 }]}>Location</T>
              <TextInput
                value={location}
                onChangeText={setLocation}
                editable={!isRemote}
                placeholder={isRemote ? "Disabled for remote gigs" : "e.g. Bengaluru, KA"}
                placeholderTextColor={palette.subText}
                style={[styles.input, { backgroundColor: palette.border, color: palette.text, opacity: isRemote ? 0.6 : 1 }]}
              />
            </SurfaceCard>

            <View style={styles.ctaWrap}>
              <GhostButton label="Save Draft" onPress={() => handleSave(true)} />
              <PrimaryButton
                label={isEditing ? "Update Gig" : "Post Gig"}
                icon={isSaving ? undefined : "send"}
                onPress={canPost ? () => handleSave(false) : undefined}
                style={{ opacity: canPost ? 1 : 0.55 }}
              />
              {isSaving && <ActivityIndicator color="#fff" style={styles.loadingOverlay} />}
              <T weight="medium" color={palette.subText} style={styles.validation}>
                Title must be at least 10 characters and description at least 30.
              </T>
            </View>
          </View>
        </ScrollView>
      )}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  card: { padding: 12 },
  metaLabel: { fontSize: 10, letterSpacing: 0.9, marginBottom: 8 },
  label: { fontSize: 14, marginBottom: 7 },
  helper: { fontSize: 11, marginTop: 2 },
  input: {
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 12,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  textArea: {
    borderRadius: 10,
    minHeight: 106,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  budgetRow: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "flex-start" },
  budgetCol: { flex: 1, minWidth: 0 },
  budgetInputWrap: {
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  currency: { fontSize: 14, marginRight: 6 },
  budgetInput: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    paddingVertical: 0,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, textTransform: "capitalize" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ctaWrap: { marginTop: 4, marginBottom: 24, gap: 8, position: "relative" },
  errorText: { fontSize: 11, marginTop: 8 },
  validation: { fontSize: 11, textAlign: "center" },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingOverlay: { position: "absolute", top: "50%", left: "50%", marginTop: -10, marginLeft: -10, zIndex: 10 },
});
