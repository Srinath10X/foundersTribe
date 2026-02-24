import { Ionicons } from "@expo/vector-icons";
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
  FlowScreen,
  PrimaryButton,
  SurfaceCard,
  T,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useCreateGig, useGig, useUpdateGig } from "@/hooks/useGig";
import type { GigCreateInput, GigUpdateInput } from "@/types/gig";

const experienceOptions = ["junior", "mid", "senior"] as const;

export default function PostGigScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const { data: existingGig, isLoading: isFetching } = useGig(id);
  const createGigMutation = useCreateGig();
  const updateGigMutation = useUpdateGig();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("1200");
  const [budgetMax, setBudgetMax] = useState("2500");
  const [experienceLevel, setExperienceLevel] = useState<(typeof experienceOptions)[number]>("mid");
  const [isRemote, setIsRemote] = useState(true);
  const [location, setLocation] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [formInitialized, setFormInitialized] = useState(!isEditing);

  const isSaving = createGigMutation.isPending || updateGigMutation.isPending;

  useEffect(() => {
    if (isEditing && existingGig && !formInitialized) {
      setTitle(existingGig.title || "");
      setDescription(existingGig.description || "");
      setBudgetMin(String(existingGig.budget_min ?? 0));
      setBudgetMax(String(existingGig.budget_max ?? 0));
      setExperienceLevel(existingGig.experience_level || "mid");
      setIsRemote(existingGig.is_remote ?? true);
      setLocation(existingGig.location_text || "");
      if (existingGig.gig_tags && existingGig.gig_tags.length > 0) {
        setTagsInput(existingGig.gig_tags.map((gt) => gt.tags?.label).filter(Boolean).join(", "));
      }
      setFormInitialized(true);
    }
  }, [existingGig, formInitialized, isEditing]);

  const budgetError = useMemo(() => {
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (Number.isNaN(min) || Number.isNaN(max)) return "Enter valid numbers for budget.";
    if (min < 0 || max < 0) return "Budget values cannot be negative.";
    if (max < min) return "Maximum budget must be greater than or equal to minimum.";
    return "";
  }, [budgetMax, budgetMin]);

  const canPost = useMemo(() => {
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    return title.trim().length > 0 && description.trim().length > 0 && min >= 0 && max >= min && !budgetError && !isSaving;
  }, [budgetError, budgetMax, budgetMin, description, isSaving, title]);

  const handleSave = async (isDraft = false) => {
    if (!canPost && !isDraft) return;
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (isEditing && id) {
        const payload: GigUpdateInput & { tags?: string[] } = {
          title: title.trim(),
          description: description.trim(),
          budget_type: "fixed",
          budget_min: Number(budgetMin),
          budget_max: Number(budgetMax),
          experience_level: experienceLevel,
          is_remote: isRemote,
          location_text: location.trim() || undefined,
          status: isDraft ? "draft" : "open",
          tags,
        };
        await updateGigMutation.mutateAsync({ id, data: payload });
      } else {
        const payload: GigCreateInput & { tags?: string[] } = {
          title: title.trim(),
          description: description.trim(),
          budget_type: "fixed",
          budget_min: Number(budgetMin),
          budget_max: Number(budgetMax),
          experience_level: experienceLevel,
          is_remote: isRemote,
          location_text: location.trim() || undefined,
          status: isDraft ? "draft" : "open",
          tags,
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
            Add requirements and publish your post
          </T>
        </View>
      </View>

      {isFetching ? (
        <View style={styles.loadingWrap}>
          <LoadingState rows={4} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
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
                placeholder="e.g. Senior Product Designer"
                placeholderTextColor={palette.subText}
                style={[styles.input, { backgroundColor: palette.border, color: palette.text }]}
              />

              <T weight="medium" color={palette.text} style={[styles.fieldLabel, styles.mt12]}>
                Description
              </T>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                placeholder="Describe your gig requirements"
                placeholderTextColor={palette.subText}
                style={[styles.textArea, { backgroundColor: palette.border, color: palette.text }]}
              />
            </SurfaceCard>

            <SurfaceCard style={styles.card}>
              <T weight="regular" color={palette.subText} style={styles.sectionLabel}>
                Budget
              </T>
              <View style={styles.row}>
                <View style={styles.col}>
                  <T weight="medium" color={palette.text} style={styles.fieldLabel}>
                    Minimum
                  </T>
                  <View style={[styles.amountWrap, { backgroundColor: palette.border }]}> 
                    <T weight="regular" color={palette.subText} style={styles.currency}>₹</T>
                    <TextInput
                      value={budgetMin}
                      onChangeText={setBudgetMin}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={palette.subText}
                      style={[styles.amountInput, { color: palette.text }]}
                    />
                  </View>
                </View>

                <View style={styles.col}>
                  <T weight="medium" color={palette.text} style={styles.fieldLabel}>
                    Maximum
                  </T>
                  <View style={[styles.amountWrap, { backgroundColor: palette.border }]}> 
                    <T weight="regular" color={palette.subText} style={styles.currency}>₹</T>
                    <TextInput
                      value={budgetMax}
                      onChangeText={setBudgetMax}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={palette.subText}
                      style={[styles.amountInput, { color: palette.text }]}
                    />
                  </View>
                </View>
              </View>
              {budgetError ? (
                <T weight="regular" color={palette.accent} style={styles.errorText}>
                  {budgetError}
                </T>
              ) : null}
            </SurfaceCard>

            <SurfaceCard style={styles.card}>
              <T weight="regular" color={palette.subText} style={styles.sectionLabel}>
                Requirements
              </T>

              <T weight="medium" color={palette.text} style={styles.fieldLabel}>
                Experience Level
              </T>
              <View style={styles.chips}>
                {experienceOptions.map((opt) => {
                  const active = opt === experienceLevel;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setExperienceLevel(opt)}
                      activeOpacity={0.8}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? palette.accent : palette.borderLight,
                          backgroundColor: active ? palette.accentSoft : "transparent",
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

              <T weight="medium" color={palette.text} style={[styles.fieldLabel, styles.mt12]}>
                Skills / Tags
              </T>
              <TextInput
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="e.g. React, Node.js, UI Design"
                placeholderTextColor={palette.subText}
                style={[styles.input, { backgroundColor: palette.border, color: palette.text }]}
              />
              <T weight="regular" color={palette.subText} style={styles.helper}>
                Comma separated
              </T>
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
                editable={!isRemote}
                placeholder={isRemote ? "Disabled for remote gigs" : "e.g. Bengaluru, KA"}
                placeholderTextColor={palette.subText}
                style={[
                  styles.input,
                  { backgroundColor: palette.border, color: palette.text, opacity: isRemote ? 0.55 : 1 },
                ]}
              />
            </SurfaceCard>

            <View style={styles.ctaWrap}>
              <PrimaryButton
                label={isEditing ? "Update Gig" : "Post Gig"}
                icon="send"
                onPress={() => handleSave(false)}
                disabled={!canPost}
                loading={isSaving}
              />
              <T weight="regular" color={palette.subText} style={styles.validationHint}>
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
  row: {
    flexDirection: "row",
    gap: 8,
  },
  col: {
    flex: 1,
  },
  amountWrap: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  currency: {
    fontSize: 14,
    lineHeight: 18,
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
