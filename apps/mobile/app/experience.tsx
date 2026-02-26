import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
                  <View style={[styles.workIconWrap, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                    <Ionicons name="briefcase-outline" size={18} color="#3B82F6" />
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
                        <View style={styles.currentTag}>
                          <T weight="medium" color="#2F9254" style={styles.currentTagText}>
                            Current
                          </T>
                        </View>
                      ) : null}
                      <T weight="regular" color="#9CA3AF" style={styles.workDuration} numberOfLines={1}>
                        {duration}
                      </T>
                    </View>
                  </View>
                </SurfaceCard>
              );
            })
          )}
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
    borderColor: "rgba(59, 130, 246, 0.2)",
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
    backgroundColor: "rgba(56, 189, 120, 0.15)",
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
