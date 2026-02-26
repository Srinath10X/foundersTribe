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

type ProofWorkItem = {
  title?: string;
  description?: string;
};

export default function ProofOfWorkScreen() {
  const router = useRouter();
  const { palette } = useFlowPalette();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ProofWorkItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProofOfWork = useCallback(async () => {
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

      const rawItems =
        (Array.isArray(db?.completed_gigs) && db.completed_gigs) ||
        (Array.isArray(metaProfile?.completed_gigs) ? metaProfile.completed_gigs : []);

      const normalized = (rawItems as ProofWorkItem[]).filter((item) => {
        const title = String(item?.title || "").trim();
        const description = String(item?.description || "").trim();
        return title.length > 0 || description.length > 0;
      });

      setItems(normalized);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadProofOfWork();
  }, [loadProofOfWork]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProofOfWork();
    setRefreshing(false);
  }, [loadProofOfWork]);

  const saveWork = useCallback(async () => {
    const title = draftTitle.trim();
    const description = draftDescription.trim();
    if (!title && !description) {
      Alert.alert("Missing info", "Please enter title or description.");
      return;
    }
    if (!session?.access_token) return;

    const nextItems = [...items, { title, description }];
    setSaving(true);
    try {
      await tribeApi.updateMyProfile(session.access_token, {
        completed_gigs: nextItems,
      });
      setItems(nextItems);
      setDraftTitle("");
      setDraftDescription("");
      setShowAddForm(false);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to add work");
    } finally {
      setSaving(false);
    }
  }, [draftDescription, draftTitle, items, session?.access_token]);

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
          Proof of Work
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
          ) : items.length === 0 ? (
            <SurfaceCard style={styles.emptyCard}>
              <T weight="regular" color={palette.subText} style={styles.emptyText}>
                No proof of work added yet.
              </T>
            </SurfaceCard>
          ) : (
            items.map((item, index) => (
              <SurfaceCard key={`proof-${index}`} style={styles.itemCard}>
                <View style={styles.itemHead}>
                  <View
                    style={[
                      styles.itemIconWrap,
                      { backgroundColor: palette.accentSoft, borderColor: palette.borderLight },
                    ]}
                  >
                    <Ionicons name="folder-open-outline" size={15} color={palette.accent} />
                  </View>
                  <View style={[styles.itemIndexTag, { borderColor: palette.borderLight }]}>
                    <T weight="bold" color={palette.accent} style={styles.itemIndexText}>
                      Work {index + 1}
                    </T>
                  </View>
                </View>
                <T weight="semiBold" color={palette.text} style={styles.itemTitle} numberOfLines={2}>
                  {String(item?.title || "Work")}
                </T>
                <T weight="regular" color={palette.subText} style={styles.itemDescription} numberOfLines={5}>
                  {String(item?.description || "Description")}
                </T>
              </SurfaceCard>
            ))
          )}

          {showAddForm ? (
            <SurfaceCard style={styles.formCard}>
              <TextInput
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Work title"
                placeholderTextColor={palette.subText}
                style={[styles.input, { borderColor: palette.borderLight, color: palette.text }]}
              />
              <TextInput
                value={draftDescription}
                onChangeText={setDraftDescription}
                placeholder="Work description"
                placeholderTextColor={palette.subText}
                multiline
                style={[styles.input, styles.textArea, { borderColor: palette.borderLight, color: palette.text }]}
              />
              <View style={styles.formActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.secondaryBtn, { borderColor: palette.borderLight }]}
                  onPress={() => {
                    setShowAddForm(false);
                    setDraftTitle("");
                    setDraftDescription("");
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
                  onPress={saveWork}
                  disabled={saving}
                >
                  <T weight="semiBold" color="#FFFFFF" style={styles.btnText}>
                    {saving ? "Saving..." : "Save Work"}
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
                    Add Work
                  </T>
                  <T weight="regular" color={palette.subText} style={styles.actionHint}>
                    Add project title and description
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
  textArea: {
    minHeight: 92,
    textAlignVertical: "top",
    paddingTop: 10,
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
  itemCard: {
    padding: 12,
    gap: 8,
  },
  itemHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  itemIndexTag: {
    borderWidth: 1,
    borderRadius: 999,
    height: 22,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  itemIndexText: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  itemTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
});
