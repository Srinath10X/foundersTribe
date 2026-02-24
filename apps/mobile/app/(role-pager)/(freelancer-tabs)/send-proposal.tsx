import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { FlowScreen, SurfaceCard, T, useFlowPalette } from "@/components/community/freelancerFlow/shared";

const PROPOSAL_STATUS_KEY = "freelancer_proposal_status_v1";

export default function FreelancerSendProposalScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    company?: string;
    budget?: string;
    timeline?: string;
  }>();

  const gigId = typeof params.id === "string" ? params.id : "";
  const gigTitle = typeof params.title === "string" && params.title.trim() ? params.title : "Selected Gig";
  const gigCompany = typeof params.company === "string" && params.company.trim() ? params.company : "Founder Company";
  const suggestedBudget = typeof params.budget === "string" && params.budget.trim() ? params.budget : "₹25,000";
  const suggestedTimeline = typeof params.timeline === "string" && params.timeline.trim() ? params.timeline : "2 weeks";

  const [price, setPrice] = useState(suggestedBudget.replace(/[^0-9]/g, "") || "25000");
  const [timeline, setTimeline] = useState(suggestedTimeline);
  const [availability, setAvailability] = useState("Immediate");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [milestonePlan, setMilestonePlan] = useState("");
  const [coverNote, setCoverNote] = useState("");

  const canSubmit = useMemo(() => {
    return (
      price.trim().length > 0 &&
      timeline.trim().length > 0 &&
      availability.trim().length > 0 &&
      coverNote.trim().length > 20
    );
  }, [availability, coverNote, price, timeline]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const raw = await AsyncStorage.getItem(PROPOSAL_STATUS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      const gigKey = gigId || "unknown-gig";
      map[gigKey] = {
        status: "pending",
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(PROPOSAL_STATUS_KEY, JSON.stringify(map));
    } catch {
      // best-effort local persistence
    }
    router.replace("/(role-pager)/(freelancer-tabs)/browse-gigs");
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
              {gigTitle}
            </T>
            <T weight="regular" color={palette.subText} style={styles.gigMeta} numberOfLines={1}>
              {gigCompany}
            </T>

            <View style={styles.gigHints}>
              <View style={[styles.hintPill, { backgroundColor: palette.borderLight }]}> 
                <T weight="regular" color={palette.subText} style={styles.hintText}>
                  Budget {suggestedBudget}
                </T>
              </View>
              <View style={[styles.hintPill, { backgroundColor: palette.borderLight }]}> 
                <T weight="regular" color={palette.subText} style={styles.hintText}>
                  Timeline {suggestedTimeline}
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
                  Delivery Timeline
                </T>
                <TextInput
                  value={timeline}
                  onChangeText={setTimeline}
                  placeholder="2 weeks"
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
              placeholder="Explain why you are a good fit, your execution approach, and expected outcomes."
              placeholderTextColor={palette.subText}
              style={[styles.textarea, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
            />
          </SurfaceCard>

          <SurfaceCard style={styles.formCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Additional Details
            </T>

            <T weight="medium" color={palette.subText} style={styles.label}>
              Portfolio / Work Sample URL
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
              placeholder="Break delivery into milestones with expected dates."
              placeholderTextColor={palette.subText}
              style={[styles.textareaSmall, { borderColor: palette.borderLight, color: palette.text, backgroundColor: palette.surface }]}
            />
          </SurfaceCard>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!canSubmit}
            style={[styles.submitBtn, { backgroundColor: palette.accent, opacity: canSubmit ? 1 : 0.45 }]}
            onPress={handleSubmit}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <T weight="medium" color="#fff" style={styles.submitText}>
              Submit Proposal
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
  checkRowWrap: {
    marginTop: 12,
    gap: 8,
  },
  checkPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  checkText: {
    fontSize: 12,
    lineHeight: 16,
  },
  summaryCard: {
    padding: 13,
    borderRadius: 12,
  },
  summaryRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  summaryValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  submitBtn: {
    marginTop: 2,
    borderRadius: 12,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  submitText: {
    fontSize: 14,
    lineHeight: 18,
  },
});
