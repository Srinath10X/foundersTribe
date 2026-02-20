import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

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

export default function PostGigScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar
        title="Post a Gig"
        left="arrow-back"
        right="document-text-outline"
        onLeftPress={nav.back}
        onRightPress={() => {}}
      />

      <View style={styles.content}>
        <SurfaceCard style={styles.sectionCard}>
          <T weight="semiBold" color={palette.subText} style={styles.sectionLabel}>
            BASIC INFO
          </T>

          <T weight="bold" color={palette.text} style={styles.label}>
            Gig Title
          </T>
          <TextInput
            placeholder="e.g. Senior Product Designer"
            placeholderTextColor={palette.subText}
            style={[styles.input, { backgroundColor: palette.border, color: palette.text }]}
          />

          <T weight="bold" color={palette.text} style={[styles.label, { marginTop: 14 }]}>
            Description
          </T>
          <TextInput
            multiline
            textAlignVertical="top"
            placeholder="Describe the project scope, key deliverables, and responsibilities..."
            placeholderTextColor={palette.subText}
            style={[styles.textArea, { backgroundColor: palette.border, color: palette.text }]}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.sectionCard}>
          <T weight="semiBold" color={palette.subText} style={styles.sectionLabel}>
            SKILLS & TERMS
          </T>

          <T weight="bold" color={palette.text} style={styles.label}>
            Required Skills
          </T>
          <View style={styles.skillRow}>
            {[
              { label: "UI Design", selected: true },
              { label: "React", selected: true },
              { label: "+ Add Skill", selected: false },
            ].map((s) => (
              <TouchableOpacity
                key={s.label}
                style={[
                  styles.pill,
                  {
                    backgroundColor: s.selected ? palette.accent : palette.surface,
                    borderColor: s.selected ? palette.accent : palette.border,
                  },
                ]}
                activeOpacity={0.85}
              >
                <T weight="semiBold" color={s.selected ? "#fff" : palette.subText} style={styles.pillText}>
                  {s.label}
                </T>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <T weight="bold" color={palette.text} style={styles.label}>Budget Type</T>
              <View style={[styles.segment, { borderColor: palette.border }]}> 
                <View style={[styles.segActive, { backgroundColor: palette.surface }]}> 
                  <T weight="bold" color={palette.text} style={styles.segText}>Fixed</T>
                </View>
                <View style={styles.segPlain}>
                  <T weight="semiBold" color={palette.subText} style={styles.segText}>Range</T>
                </View>
              </View>
            </View>

            <View style={styles.col}>
              <T weight="bold" color={palette.text} style={styles.label}>Timeline</T>
              <TouchableOpacity style={[styles.dateBtn, { backgroundColor: palette.border }]} activeOpacity={0.85}> 
                <T weight="medium" color={palette.text} style={styles.dateText}>Select Date</T>
                <Ionicons name="calendar" size={20} color={palette.subText} />
              </TouchableOpacity>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.sectionCard}>
          <T weight="semiBold" color={palette.subText} style={styles.sectionLabel}>
            LOCATION
          </T>

          <View style={[styles.remoteCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <View style={[styles.pin, { backgroundColor: palette.accentSoft }]}> 
              <Ionicons name="location" size={18} color={palette.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <T weight="bold" color={palette.text} style={styles.remoteTitle}>Remote Only</T>
              <T weight="medium" color={palette.subText} style={styles.remoteSub}>Work from anywhere</T>
            </View>
            <View style={[styles.toggle, { backgroundColor: palette.accent }]}>
              <View style={styles.knob} />
            </View>
          </View>

          <T weight="semiBold" color={palette.subText} style={[styles.label, { marginTop: 14 }]}>Location (Optional)</T>
          <View style={[styles.location, { backgroundColor: palette.border }]}> 
            <Ionicons name="location" size={18} color={palette.subText} />
            <TextInput
              placeholder="e.g. San Francisco, CA"
              placeholderTextColor={palette.subText}
              style={[styles.locationInput, { color: palette.text }]}
            />
          </View>
        </SurfaceCard>

        <View style={styles.ctaWrap}>
          <GhostButton label="Save Draft" onPress={() => nav.push("/freelancer-stack/my-gigs")} style={styles.secondaryBtn} />
          <PrimaryButton label="Post Gig" icon="send" onPress={() => nav.push("/freelancer-stack/my-gigs")} style={styles.primaryBtn} />
        </View>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  sectionCard: { padding: 12 },
  sectionLabel: { fontSize: 10, letterSpacing: 0.8, marginBottom: 8 },
  label: { fontSize: 16, marginBottom: 8 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  textArea: {
    borderRadius: 12,
    minHeight: 120,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  skillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  pillText: { fontSize: 13 },
  twoCol: { flexDirection: "row", gap: 10, marginTop: 14 },
  col: { flex: 1 },
  segment: { borderWidth: 1, borderRadius: 12, padding: 3, flexDirection: "row" },
  segActive: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  segPlain: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  segText: { fontSize: 13 },
  dateBtn: {
    borderRadius: 12,
    height: 46,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  dateText: { fontSize: 13 },
  remoteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pin: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  remoteTitle: { fontSize: 16 },
  remoteSub: { fontSize: 12, marginTop: 2 },
  toggle: { width: 48, height: 28, borderRadius: 14, justifyContent: "center" },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFF", alignSelf: "flex-end", marginRight: 2 },
  location: {
    marginTop: 4,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationInput: { flex: 1, fontFamily: "Poppins_500Medium", fontSize: 14 },
  ctaWrap: { marginTop: 6, marginBottom: 4, gap: 8 },
  secondaryBtn: { height: 48 },
  primaryBtn: { height: 50 },
});
