import { Spacing, Type } from "@/constants/DesignSystem";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SocialLink = { platform: string; url: string; label: string };
type RoleOption = {
  value: "founder" | "freelancer" | "both";
  title: string;
  description: string;
  tag: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

const EMPTY_IDEA = { idea: "" };
const EMPTY_LINK: SocialLink = { platform: "", url: "", label: "" };
const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "founder",
    title: "Founder",
    description:
      "I have an idea or startup and want collaborators, talent, and growth.",
    tag: "Build",
    icon: "rocket-outline",
  },
  {
    value: "freelancer",
    title: "Freelancer",
    description: "I want exciting projects, paid work, and teams to build with.",
    tag: "Work",
    icon: "code-slash-outline",
  },
  {
    value: "both",
    title: "Founder & Freelancer",
    description: "I am building my startup and open to freelance opportunities too.",
    tag: "Hybrid",
    icon: "people-outline",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { user, session, refreshOnboardingStatus } = useAuth();
  const { switchRole } = useRole();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const token = session?.access_token || "";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [userType, setUserType] = useState<"founder" | "freelancer" | "both" | null>(
    null,
  );
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [categories, setCategories] = useState<
    { id: string; label: string; image: string }[]
  >([]);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [completedGigs, setCompletedGigs] = useState<any[]>([]);
  const [businessIdeas, setBusinessIdeas] = useState<{ idea: string }[]>([
    EMPTY_IDEA,
  ]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([EMPTY_LINK]);

  useEffect(() => {
    fetchCategories();
    preloadProfile();
  }, []);

  const preloadProfile = async () => {
    if (!token) return;
    try {
      const data = await tribeApi.getMyProfile(token);
      setFullName(data.display_name || "");
      setBio(data.bio || "");
      setLinkedinUrl(data.linkedin_url || "");
      setContact(data.contact || "");
      setLocation(data.location || "");
      setRole(data.role || "");
      setCompletedGigs(Array.isArray(data.completed_gigs) ? data.completed_gigs : []);
      setUserType(
        typeof data.user_type === "string"
          ? (data.user_type.toLowerCase() as "founder" | "freelancer" | "both")
          : (data.user_type || null)
      );

      if (Array.isArray(data.business_ideas) && data.business_ideas.length > 0) {
        setBusinessIdeas(
          data.business_ideas
            .filter((idea: unknown) => typeof idea === "string")
            .map((idea: string) => ({ idea })),
        );
      } else if (typeof data.business_idea === "string" && data.business_idea.trim()) {
        setBusinessIdeas([{ idea: data.business_idea }]);
      }

      if (Array.isArray(data.social_links) && data.social_links.length > 0) {
        setSocialLinks(
          data.social_links
            .filter((link: any) => link && typeof link.url === "string")
            .map((link: any) => ({
              platform: String(link.platform || ""),
              url: String(link.url || ""),
              label: String(link.label || ""),
            })),
        );
      }
    } catch (error) {
      console.log("Onboarding profile preload skipped:", error);
    }
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from("Articles")
        .select('Category, "Image URL"')
        .not("Category", "is", null)
        .order("Category");

      if (error) throw error;

      if (data) {
        const categoryMap = new Map<string, string>();
        data.forEach((item) => {
          if (item.Category && !categoryMap.has(item.Category) && item["Image URL"]) {
            categoryMap.set(item.Category, item["Image URL"]);
          }
        });

        setCategories(
          Array.from(categoryMap.entries()).map(([cat, img]) => ({
            id: cat.toLowerCase().replace(/ /g, "_"),
            label: cat,
            image:
              img || "https://images.unsplash.com/photo-1557683311-eac922347aa1",
          })),
        );
      }
    } catch (e) {
      console.error("Error fetching categories:", e);
    } finally {
      setLoadingCategories(false);
    }
  };

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const addBusinessIdea = () => setBusinessIdeas([...businessIdeas, EMPTY_IDEA]);
  const updateBusinessIdea = (index: number, value: string) => {
    const updated = [...businessIdeas];
    updated[index] = { idea: value };
    setBusinessIdeas(updated);
  };
  const removeBusinessIdea = (index: number) => {
    setBusinessIdeas(
      businessIdeas.length === 1
        ? [EMPTY_IDEA]
        : businessIdeas.filter((_, i) => i !== index),
    );
  };

  const addSocialLink = () => setSocialLinks([...socialLinks, EMPTY_LINK]);
  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };
  const removeSocialLink = (index: number) => {
    setSocialLinks(
      socialLinks.length === 1 ? [EMPTY_LINK] : socialLinks.filter((_, i) => i !== index),
    );
  };

  const validBusinessIdeas = useMemo(
    () => businessIdeas.map((item) => item.idea.trim()).filter(Boolean),
    [businessIdeas],
  );

  const validSocialLinks = useMemo(
    () =>
      socialLinks
        .map((link) => ({
          platform: link.platform.trim(),
          url: normalizeUrl(link.url),
          label: link.label.trim(),
        }))
        .filter((link) => link.url),
    [socialLinks],
  );

  const saveProfileStepAndContinue = async () => {
    if (!token) return;
    setSavingProfile(true);
    try {
      await tribeApi.updateMyProfile(token, {
        display_name: fullName.trim() || undefined,
        bio: bio.trim() || null,
        linkedin_url: normalizeUrl(linkedinUrl) || null,
        user_type: userType,
        contact: contact.trim() || null,
        location: location.trim() || null,
        role: role.trim() || null,
        completed_gigs: completedGigs,
        business_ideas: userType === "founder" || userType === "both" ? validBusinessIdeas : [],
        business_idea: userType === "founder" || userType === "both" ? validBusinessIdeas[0] || null : null,
        social_links: validSocialLinks,
      });
      setStep(3);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save profile details");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveRoleStepAndContinue = async () => {
    if (!token || !userType) return;
    setSavingRole(true);
    try {
      await tribeApi.updateMyProfile(token, {
        user_type: userType,
      });
      // Persist the selected role locally for navigation
      switchRole(userType === "both" ? "founder" : userType);
      setStep(2);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save your role");
    } finally {
      setSavingRole(false);
    }
  };

  const handleSkipProfile = () => setStep(3);
  const handleSkipRole = () => setStep(2);

  const toggleInterest = (id: string) => {
    const normalizedId = id.toLowerCase().replace(/ /g, "_");
    if (selected.includes(normalizedId)) {
      setSelected((prev) => prev.filter((i) => i !== normalizedId));
    } else {
      setSelected((prev) => [...prev, normalizedId]);
    }
  };

  const isSelected = (id: string) => selected.includes(id.toLowerCase().replace(/ /g, "_"));

  const handleFinish = async () => {
    if (!user || selected.length < 3) return;
    setSavingInterests(true);

    try {
      const interestsData = selected.map((catId) => {
        const cat = categories.find((c) => c.id === catId);
        return { user_id: user.id, category: cat ? cat.label : catId };
      });

      const del = await supabase.from("user_interests").delete().eq("user_id", user.id);
      if (del.error) throw del.error;

      const ins = await supabase.from("user_interests").insert(interestsData);
      if (ins.error) throw ins.error;

      await refreshOnboardingStatus();
      const target =
        userType === "freelancer"
          ? "/(role-pager)/(freelancer-tabs)/dashboard"
          : "/(role-pager)/(founder-tabs)/community"; // "both" also goes to founder home
      setTimeout(() => router.replace(target), 300);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to complete onboarding");
    } finally {
      setSavingInterests(false);
    }
  };

  const renderProfileStep = () => (
    <KeyboardAvoidingView
      style={styles.flex1}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 100 : 0}
    >
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.titleSection}>
        <Text style={[styles.mainTitle, { color: theme.text.primary }]}>Your Profile</Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Add details founders can use to understand what you are building.
        </Text>
      </Animated.View>

      <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.text.secondary }]}>Full Name</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text.primary }]}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          placeholderTextColor={theme.text.muted}
          maxLength={50}
        />

        <Text style={[styles.label, { color: theme.text.secondary }]}>Bio</Text>
        <TextInput
          style={[styles.input, styles.multilineInput, { borderColor: theme.border, color: theme.text.primary }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about your background"
          placeholderTextColor={theme.text.muted}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />

        <Text style={[styles.label, { color: theme.text.secondary }]}>LinkedIn URL</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text.primary }]}
          value={linkedinUrl}
          onChangeText={setLinkedinUrl}
          placeholder="linkedin.com/in/your-name"
          placeholderTextColor={theme.text.muted}
          autoCapitalize="none"
          keyboardType="url"
        />

        {(userType === "freelancer" || userType === "both") && (
          <>
            <Text style={[styles.label, { color: theme.text.secondary }]}>Contact Info</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text.primary }]}
              value={contact}
              onChangeText={setContact}
              placeholder="Email or WhatsApp"
              placeholderTextColor={theme.text.muted}
            />

            <Text style={[styles.label, { color: theme.text.secondary }]}>Freelancer Role</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text.primary }]}
              value={role}
              onChangeText={setRole}
              placeholder="e.g. Fullstack Developer, UI Designer"
              placeholderTextColor={theme.text.muted}
            />

            <Text style={[styles.label, { color: theme.text.secondary }]}>Location</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text.primary }]}
              value={location}
              onChangeText={setLocation}
              placeholder="City, Country"
              placeholderTextColor={theme.text.muted}
            />
          </>
        )}
      </View>

      {(userType === "founder" || userType === "both") ? (
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Business Ideas</Text>
            <TouchableOpacity onPress={addBusinessIdea}>
              <Ionicons name="add-circle" size={22} color={theme.brand.primary} />
            </TouchableOpacity>
          </View>
          {businessIdeas.map((item, index) => (
            <View key={index} style={[styles.dynamicItem, { borderColor: theme.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.itemIndex, { color: theme.text.muted }]}>#{index + 1}</Text>
                <TouchableOpacity onPress={() => removeBusinessIdea(index)}>
                  <Ionicons name="trash-outline" size={18} color="#CF2030" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, styles.multilineInput, { borderColor: theme.border, color: theme.text.primary }]}
                value={item.idea}
                onChangeText={(value) => updateBusinessIdea(index, value)}
                placeholder="Tell us about the product/ idea/ problem statement you working on"
                placeholderTextColor={theme.text.muted}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Experience</Text>
            <TouchableOpacity onPress={addSocialLink}>
              {/* Reusing social link UI pattern for simplicity in onboarding, but we'll use previous_works state eventually if needed. For now let's just use bio/role/location for freelancer experience in Step 2 */}
            </TouchableOpacity>
          </View>
          <Text style={[styles.emptyText, { color: theme.text.muted, marginTop: 8 }]}>
            You can add detailed experience in your profile later.
          </Text>
        </View>
      )}

      <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Social Links</Text>
          <TouchableOpacity onPress={addSocialLink}>
            <Ionicons name="add-circle" size={22} color={theme.brand.primary} />
          </TouchableOpacity>
        </View>
        {socialLinks.map((link, index) => (
          <View key={index} style={[styles.dynamicItem, { borderColor: theme.border }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.itemIndex, { color: theme.text.muted }]}>#{index + 1}</Text>
              <TouchableOpacity onPress={() => removeSocialLink(index)}>
                <Ionicons name="trash-outline" size={18} color="#CF2030" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text.primary }]}
              value={link.platform}
              onChangeText={(value) => updateSocialLink(index, "platform", value)}
              placeholder="Platform (x, linkedin, github...)"
              placeholderTextColor={theme.text.muted}
            />
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text.primary }]}
              value={link.url}
              onChangeText={(value) => updateSocialLink(index, "url", value)}
              placeholder="URL"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text.primary }]}
              value={link.label}
              onChangeText={(value) => updateSocialLink(index, "label", value)}
              placeholder="Label"
              placeholderTextColor={theme.text.muted}
            />
          </View>
        ))}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderRoleStep = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View
        entering={FadeInUp.delay(100).duration(500)}
        style={styles.titleSection}
      >
        <Text style={[styles.mainTitle, { color: theme.text.primary }]}>
          Choose Your Path
        </Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Are you here to build a startup or offer your skills?
        </Text>
      </Animated.View>

      <View style={styles.roleGrid}>
        <Text style={[styles.roleHint, { color: theme.text.tertiary }]}>Choose one option to continue</Text>
        <View
          style={[
            styles.roleSingleCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {ROLE_OPTIONS.map((option, index) => {
            const active = userType === option.value;

            return (
              <View key={option.value}>
                <TouchableOpacity
                  style={[
                    styles.roleOptionRow,
                    active && { backgroundColor: theme.surfaceElevated },
                  ]}
                  onPress={() => setUserType(option.value)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.roleIconCircleCompact,
                      {
                        backgroundColor: active ? theme.brand.primary : theme.surfaceElevated,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={active ? "#fff" : theme.text.secondary}
                    />
                  </View>

                  <View style={styles.roleOptionText}>
                    <View style={styles.roleTitleRow}>
                      <Text style={[styles.roleTitleCompact, { color: theme.text.primary }]}>
                        {option.title}
                      </Text>
                      <View
                        style={[
                          styles.roleTag,
                          {
                            backgroundColor: active ? theme.brand.primary : theme.surfaceElevated,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleTagText,
                            { color: active ? "#fff" : theme.text.secondary },
                          ]}
                        >
                          {option.tag}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.roleDescCompact, { color: theme.text.secondary }]}>
                      {option.description}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.roleRadio,
                      { borderColor: active ? theme.brand.primary : theme.border },
                    ]}
                  >
                    {active && (
                      <View
                        style={[
                          styles.roleRadioDot,
                          { backgroundColor: theme.brand.primary },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>

                {index < ROLE_OPTIONS.length - 1 && (
                  <View style={[styles.roleDivider, { backgroundColor: theme.border }]} />
                )}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );

  const renderInterestStep = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.titleSection}>
        <Text style={[styles.mainTitle, { color: theme.text.primary }]}>What interests you?</Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Select at least 3 categories to personalize your feed.
        </Text>
      </Animated.View>

      {loadingCategories ? (
        <ActivityIndicator color={theme.brand.primary} />
      ) : (
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.moreSection}>
          <Text style={[styles.sectionHeader, { color: theme.text.tertiary }]}>ALL CATEGORIES</Text>
          <View style={styles.gridContainer}>
            {categories.map((item) => {
              const active = isSelected(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.card,
                    { backgroundColor: theme.surface },
                    active && { borderColor: theme.brand.primary },
                  ]}
                  onPress={() => toggleInterest(item.id)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                  <LinearGradient colors={["transparent", "rgba(0,0,0,0.9)"]} style={styles.cardGradient} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                  </View>
                  {active && (
                    <View style={styles.checkIcon}>
                      <Ionicons name="checkmark-circle" size={24} color="white" />
                    </View>
                  )}
                  {active && <View style={styles.activeOverlay} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={{ width: 24 }} />
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          {step === 1
            ? "Select Role"
            : step === 2
              ? "Set Up Profile"
              : "Personalize Your Feed"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressText, { color: theme.text.tertiary }]}>
            ONBOARDING PROGRESS
          </Text>
          <Text style={[styles.stepText, { color: theme.brand.primary }]}>
            Step {step} of 3
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.bar,
              {
                width: step === 1 ? "33%" : step === 2 ? "66%" : "100%",
                backgroundColor: theme.brand.primary,
              },
            ]}
          />
        </View>
      </View>

      {step === 1
        ? renderRoleStep()
        : step === 2
          ? renderProfileStep()
          : renderInterestStep()}

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, Spacing.md),
          },
        ]}
      >
        {step === 1 ? (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.skipBtn, { borderColor: theme.border }]}
              onPress={handleSkipRole}
              disabled={savingRole}
            >
              <Text style={[styles.skipText, { color: theme.text.secondary }]}>
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.continueBtn,
                {
                  backgroundColor: theme.brand.primary,
                  flex: 1,
                  marginBottom: 0,
                  opacity: !userType ? 0.5 : 1,
                },
              ]}
              onPress={saveRoleStepAndContinue}
              disabled={savingRole || !userType}
            >
              {savingRole ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.continueText}>Select & Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : step === 2 ? (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.skipBtn, { borderColor: theme.border }]}
              onPress={handleSkipProfile}
              disabled={savingProfile}
            >
              <Text style={[styles.skipText, { color: theme.text.secondary }]}>
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.continueBtn,
                { backgroundColor: theme.brand.primary, flex: 1, marginBottom: 0 },
              ]}
              onPress={saveProfileStepAndContinue}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.continueText}>Save & Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.continueBtn,
                { backgroundColor: theme.brand.primary },
                selected.length < 3 && { backgroundColor: theme.border, opacity: 0.5 },
              ]}
              onPress={handleFinish}
              disabled={selected.length < 3 || savingInterests}
            >
              {savingInterests ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.continueText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
            <Text style={[styles.countText, { color: theme.text.tertiary }]}>
              {selected.length} of 3 selected
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Spacing.md,
  },
  headerTitle: { ...Type.body, fontWeight: "700", fontSize: 16 },
  progressContainer: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressText: { ...Type.label, fontSize: 10, letterSpacing: 1 },
  stepText: { ...Type.label, fontSize: 10, fontWeight: "700" },
  track: { height: 4, borderRadius: 2 },
  bar: { height: "100%", borderRadius: 2 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 140 },
  titleSection: { marginBottom: Spacing.xl },
  mainTitle: { fontSize: 28, fontWeight: "700", marginBottom: Spacing.sm },
  subtitle: { fontSize: 15, lineHeight: 22 },
  panel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  label: { fontSize: 13, marginBottom: 6, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  multilineInput: { minHeight: 100 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dynamicItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  itemIndex: { fontSize: 12, fontWeight: "600" },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  card: {
    width: "48%",
    aspectRatio: 1.4,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 12,
  },
  cardImage: { width: "100%", height: "100%", opacity: 0.6 },
  cardGradient: { ...StyleSheet.absoluteFillObject },
  activeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(37, 99, 235, 0.2)" },
  cardContent: { position: "absolute", bottom: Spacing.md, left: Spacing.md },
  cardLabel: { color: "white", fontWeight: "700", fontSize: 16 },
  checkIcon: { position: "absolute", top: 8, right: 8 },
  moreSection: { marginTop: Spacing.sm },
  sectionHeader: { ...Type.label, fontSize: 11, marginBottom: Spacing.md, letterSpacing: 1 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    borderTopWidth: 1,
  },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  skipBtn: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  skipText: { fontSize: 15, fontWeight: "600" },
  continueBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  continueText: { color: "white", fontSize: 16, fontWeight: "700" },
  countText: { fontSize: 12, textAlign: "center" },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  roleGrid: {
    gap: 10,
    marginTop: Spacing.sm,
  },
  roleHint: {
    ...Type.label,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  roleSingleCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  roleOptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  roleIconCircleCompact: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  roleOptionText: {
    flex: 1,
    paddingRight: 10,
  },
  roleTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  roleTitleCompact: {
    fontSize: 18,
    fontWeight: "700",
  },
  roleTag: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  roleDescCompact: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.8,
  },
  roleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  roleRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleDivider: {
    height: 1,
    marginLeft: 70,
  },
});
