import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { FlowScreen, SurfaceCard, T, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import * as tribeApi from "@/lib/tribeApi";

type PreviousWork = {
  company?: string;
  role?: string;
  duration?: string;
};

export default function ExperienceScreen() {
  const router = useRouter();
  const { palette } = useFlowPalette();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [works, setWorks] = useState<PreviousWork[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftRole, setDraftRole] = useState("");
  const [draftCompany, setDraftCompany] = useState("");
  const [draftDuration, setDraftDuration] = useState("");
  const [saving, setSaving] = useState(false);

  const loadExperience = useCallback(async () => {
    setLoading(true);
    try {
      const meta = session?.user?.user_metadata || {};
      const metaProfile = meta?.profile_data || {};

      let db: any = null;
      if (session?.access_token) {
        try {
          db = await tribeApi.getMyProfile(session.access_token);
        } catch {
          db = null;
        }
      }

      const rawWorks =
        (Array.isArray(db?.previous_works) && db.previous_works) ||
        (Array.isArray(metaProfile?.previous_works) ? metaProfile.previous_works : []);

      const normalized = (rawWorks as PreviousWork[]).filter((item) => {
        const role = String(item?.role || "").trim();
        const company = String(item?.company || "").trim();
        const duration = String(item?.duration || "").trim();
        return role.length > 0 || company.length > 0 || duration.length > 0;
      });

      setWorks(normalized);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadExperience();
  }, [loadExperience]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadExperience();
    setRefreshing(false);
  }, [loadExperience]);

  const saveExperience = useCallback(async () => {
    const role = draftRole.trim();
    const company = draftCompany.trim();
    const duration = draftDuration.trim();
    if (!role && !company && !duration) {
      Alert.alert("Missing info", "Please enter role, company, or duration.");
      return;
    }
    if (!session?.access_token) return;

    const nextWorks = [...works, { role, company, duration }];
    setSaving(true);
    try {
      await tribeApi.updateMyProfile(session.access_token, {
        previous_works: nextWorks,
      });
      setWorks(nextWorks);
      setDraftRole("");
      setDraftCompany("");
      setDraftDuration("");
      setShowAddForm(false);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to add experience");
    } finally {
      setSaving(false);
    }
  }, [draftCompany, draftDuration, draftRole, session?.access_token, works]);

  return (
    <FlowScreen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.surface }]}>
        <TouchableOpacity
          activeOpacity={0.84}
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <T weight="bold" color={palette.text} style={styles.title}>
          Experience
        </T>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          {loading ? (
            <SurfaceCard style={styles.centerCard}>
              <ActivityIndicator size="small" color={palette.accent} />
            </SurfaceCard>
          ) : works.length === 0 ? (
            <SurfaceCard style={styles.emptyCard}>
              <T weight="regular" color={palette.subText} style={styles.emptyText}>
                No experience added yet.
              </T>
            </SurfaceCard>
          ) : (
            works.map((work, index) => {
              const duration = String(work.duration || "Duration");
              const isCurrent = /present|current/i.test(duration);

              return (
                <SurfaceCard key={`${work.company || "work"}-${index}`} style={styles.workCard}>
                  <View
                    style={[
                      styles.workIconWrap,
                      { backgroundColor: palette.accentSoft, borderColor: palette.borderLight },
                    ]}
                  >
                    <Ionicons name="briefcase-outline" size={18} color={palette.accent} />
                  </View>
                  <View style={styles.workTextWrap}>
                    <T weight="semiBold" color={palette.text} style={styles.workRole} numberOfLines={1}>
                      {work.role || "Role"}
                    </T>
                    <T weight="regular" color={palette.subText} style={styles.workCompany} numberOfLines={1}>
                      {work.company || "Company"}
                    </T>
                    <View style={styles.workMetaRow}>
                      {isCurrent ? (
                        <View style={[styles.currentTag, { backgroundColor: palette.accentSoft }]}>
                          <T weight="medium" color={palette.success} style={styles.currentTagText}>
                            Current
                          </T>
                        </View>
                      ) : null}
                      <T weight="regular" color={palette.subText} style={styles.workDuration} numberOfLines={1}>
                        {duration}
                      </T>
                    </View>
                  </View>
                </SurfaceCard>
              );
            })
          )}

          {showAddForm ? (
            <SurfaceCard style={styles.formCard}>
              <TextInput
                value={draftRole}
                onChangeText={setDraftRole}
                placeholder="Role"
                placeholderTextColor={palette.subText}
                style={[styles.input, { borderColor: palette.borderLight, color: palette.text }]}
              />
              <TextInput
                value={draftCompany}
                onChangeText={setDraftCompany}
                placeholder="Company"
                placeholderTextColor={palette.subText}
                style={[styles.input, { borderColor: palette.borderLight, color: palette.text }]}
              />
              <TextInput
                value={draftDuration}
                onChangeText={setDraftDuration}
                placeholder="Duration (e.g. Jan 2025 - Present)"
                placeholderTextColor={palette.subText}
                style={[styles.input, { borderColor: palette.borderLight, color: palette.text }]}
              />
              <View style={styles.formActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.secondaryBtn, { borderColor: palette.borderLight }]}
                  onPress={() => {
                    setShowAddForm(false);
                    setDraftRole("");
                    setDraftCompany("");
                    setDraftDuration("");
                  }}
                  disabled={saving}
                >
                  <T weight="medium" color={palette.text} style={styles.btnText}>
                    Cancel
                  </T>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.primaryBtn, { backgroundColor: palette.accent }]}
                  onPress={saveExperience}
                  disabled={saving}
                >
                  <T weight="semiBold" color="#FFFFFF" style={styles.btnText}>
                    {saving ? "Saving..." : "Save Experience"}
                  </T>
                </TouchableOpacity>
              </View>
            </SurfaceCard>
          ) : null}

          <SurfaceCard style={styles.actionCard}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.actionBtn}
              onPress={() => setShowAddForm((prev) => !prev)}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIconWrap, { backgroundColor: palette.accentSoft }]}>
                  <Ionicons name="add" size={16} color={palette.accent} />
                </View>
                <View>
                  <T weight="semiBold" color={palette.text} style={styles.actionTitle}>
                    Add Experience
                  </T>
                  <T weight="regular" color={palette.subText} style={styles.actionHint}>
                    Add role, company and duration
                  </T>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.subText} />
            </TouchableOpacity>
          </SurfaceCard>
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0.2,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
  },
  actionCard: {
    padding: 0,
  },
  actionBtn: {
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  actionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 13,
    lineHeight: 16,
  },
  actionHint: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  formCard: {
    padding: 12,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 42,
    paddingHorizontal: 12,
    fontSize: 13,
    lineHeight: 16,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 36,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    borderRadius: 10,
    minHeight: 36,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 12,
    lineHeight: 15,
  },
  centerCard: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  workCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
  },
  workIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  workTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  workRole: {
    fontSize: 12,
    lineHeight: 16,
  },
  workCompany: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  workMetaRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  currentTagText: {
    fontSize: 10,
    lineHeight: 13,
  },
  workDuration: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
});
