import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { Avatar, FlowScreen, SurfaceCard, T, people, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const STORAGE_BUCKET = "tribe-media";

type PreviousWork = { company?: string; role?: string; duration?: string };
type SocialLink = { platform?: string; url?: string; label?: string };

type ProfileData = {
  id: string;
  display_name: string;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  user_type?: "founder" | "freelancer" | "both" | null;
  contact?: string | null;
  address?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  role?: string | null;
  previous_works?: PreviousWork[] | null;
  social_links?: SocialLink[] | null;
  completed_gigs?: { title?: string; description?: string }[] | null;
};

function toTitleCase(value: string) {
  if (!value) return value;
  if (value === value.toUpperCase()) {
    return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return value;
}

function normalizeName(raw?: string | null, email?: string | null) {
  let value = (raw || "").trim();
  if (!value) return (email || "").split("@")[0] || "User";

  if (/^[A-Za-z0-9]+-/.test(value)) {
    value = value.replace(/^[A-Za-z0-9]+-/, "").trim();
  }

  value = value
    .replace(/\b(B\.?\s*Tech|M\.?\s*Tech|BTech|MTech).*/i, "")
    .replace(/\([^)]*\)\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return toTitleCase(value || (email || "").split("@")[0] || "User");
}

async function resolveAvatar(candidate: unknown, userId: string): Promise<string | null> {
  if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (typeof candidate === "string" && candidate.trim()) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
    if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
  }

  if (!userId) return null;
  const folder = `profiles/${userId}`;
  const { data: files } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 20 });
  if (!Array.isArray(files) || files.length === 0) return null;
  const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
  if (!preferred?.name) return null;

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
  return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
}

function FieldRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null }) {
  const { palette } = useFlowPalette();
  if (!value) return null;

  return (
    <View style={styles.fieldRow}>
      <View style={[styles.fieldIcon, { backgroundColor: palette.accentSoft }]}>
        <Ionicons name={icon} size={13} color={palette.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="regular" color={palette.subText} style={styles.fieldLabel}>
          {label}
        </T>
        <T weight="medium" color={palette.text} style={styles.fieldValue} numberOfLines={2}>
          {value}
        </T>
      </View>
    </View>
  );
}

export default function FreelancerProfileScreen() {
  const { palette } = useFlowPalette();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { session } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const loadProfile = useCallback(async () => {
    const userId = session?.user?.id || "";
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

    const resolvedAvatar =
      (await resolveAvatar(db?.photo_url || db?.avatar_url || meta?.avatar_url || meta?.picture || null, userId)) ||
      people.alex;

    const merged: ProfileData = {
      id: userId,
      display_name: normalizeName(db?.display_name || meta?.full_name || meta?.name, session?.user?.email),
      username: db?.username || null,
      bio: db?.bio ?? metaProfile?.bio ?? null,
      avatar_url: resolvedAvatar,
      photo_url: resolvedAvatar,
      user_type: (db?.user_type || meta?.user_type || meta?.role || "freelancer") as any,
      contact: db?.contact ?? metaProfile?.contact ?? null,
      address: db?.address ?? metaProfile?.address ?? null,
      location: db?.location ?? metaProfile?.location ?? null,
      linkedin_url: db?.linkedin_url ?? metaProfile?.linkedin_url ?? null,
      role: db?.role ?? metaProfile?.role ?? null,
      previous_works:
        (Array.isArray(db?.previous_works) && db.previous_works) ||
        (Array.isArray(metaProfile?.previous_works) ? metaProfile.previous_works : []),
      social_links:
        (Array.isArray(db?.social_links) && db.social_links) ||
        (Array.isArray(metaProfile?.social_links) ? metaProfile.social_links : []),
      completed_gigs:
        (Array.isArray(db?.completed_gigs) && db.completed_gigs) ||
        (Array.isArray(metaProfile?.completed_gigs) ? metaProfile.completed_gigs : []),
    };

    setProfile(merged);
  }, [session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const works = profile?.previous_works || [];
  const previousWorks = (Array.isArray(profile?.completed_gigs) ? profile.completed_gigs : []) || [];
  const links = (profile?.social_links || []).filter((x) => x?.url);

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <T weight="medium" color={palette.text} style={styles.pageTitle}>
          Profile
        </T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
          Keep your public profile updated
        </T>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          <SurfaceCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Avatar source={profile?.photo_url || people.alex} size={64} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.heroName} numberOfLines={1}>
                  {profile?.display_name || "User"}
                </T>
                <T weight="regular" color={palette.subText} style={styles.heroMeta} numberOfLines={1}>
                  @{profile?.username || "user"}
                </T>
                <T weight="regular" color={palette.subText} style={styles.heroMeta} numberOfLines={1}>
                  {profile?.user_type || "freelancer"}
                </T>
              </View>
            </View>

            <T weight="regular" color={palette.subText} style={styles.bioText}>
              {profile?.bio || "Add a short bio to make your profile stronger."}
            </T>

            <TouchableOpacity
              activeOpacity={0.86}
              style={[styles.editBtn, { backgroundColor: palette.accent }]}
              onPress={() => router.push("/edit-profile")}
            >
              <Ionicons name="create-outline" size={14} color="#fff" />
              <T weight="medium" color="#fff" style={styles.editBtnText}>
                Edit Profile
              </T>
            </TouchableOpacity>
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Personal Details
            </T>
            <View style={styles.sectionStack}>
              <FieldRow icon="call-outline" label="Phone" value={profile?.contact} />
              <FieldRow icon="location-outline" label="Address" value={profile?.address} />
              <FieldRow icon="navigate-outline" label="Location" value={profile?.location} />
              <FieldRow icon="logo-linkedin" label="LinkedIn" value={profile?.linkedin_url} />
              <FieldRow icon="briefcase-outline" label="Role" value={profile?.role} />
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Experience
            </T>
            <View style={styles.sectionStack}>
              {works.length === 0 ? (
                <T weight="regular" color={palette.subText} style={styles.emptyText}>
                  No experience items added yet.
                </T>
              ) : (
                works.slice(0, 4).map((work, index) => (
                  <View key={`${work.company || "work"}-${index}`} style={[styles.workItem, { borderColor: palette.borderLight }]}> 
                    <T weight="medium" color={palette.text} style={styles.workRole} numberOfLines={1}>
                      {work.role || "Role"}
                    </T>
                    <T weight="regular" color={palette.subText} style={styles.workCompany} numberOfLines={1}>
                      {work.company || "Company"}
                    </T>
                    <T weight="regular" color={palette.subText} style={styles.workDuration} numberOfLines={1}>
                      {work.duration || "Duration"}
                    </T>
                  </View>
                ))
              )}
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Previous Works
            </T>
            <View style={styles.sectionStack}>
              {previousWorks.length === 0 ? (
                <T weight="regular" color={palette.subText} style={styles.emptyText}>
                  No previous works added yet.
                </T>
              ) : (
                previousWorks.slice(0, 4).map((work, index) => (
                  <View key={`prev-${index}`} style={[styles.workItem, { borderColor: palette.borderLight }]}>
                    <T weight="medium" color={palette.text} style={styles.workRole}>
                      {String(work?.title || "Work")}
                    </T>
                    <T weight="regular" color={palette.subText} style={styles.workCompany}>
                      {String(work?.description || "Description")}
                    </T>
                  </View>
                ))
              )}
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Social Links
              </T>
            </View>
            {links.length === 0 ? (
              <T weight="regular" color={palette.subText} style={styles.emptyText}>
                No social links added.
              </T>
            ) : (
              <View style={styles.linksWrap}>
                {links.slice(0, 6).map((item, index) => (
                  <TouchableOpacity
                    key={`${item.platform || "link"}-${index}`}
                    style={[styles.linkPill, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="link-outline" size={13} color={palette.subText} />
                    <T weight="regular" color={palette.text} style={styles.linkText} numberOfLines={1}>
                      {item.label || item.platform || "Link"}
                    </T>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </SurfaceCard>

          <TouchableOpacity
            activeOpacity={0.86}
            style={[styles.logoutBtn, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace("/");
            }}
          >
            <Ionicons name="log-out-outline" size={15} color={palette.accent} />
            <T weight="medium" color={palette.accent} style={styles.logoutBtnText}>
              Logout
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
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  heroCard: {
    padding: 14,
    borderRadius: 14,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroName: {
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  heroMeta: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  bioText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
  },
  editBtn: {
    marginTop: 12,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  editBtnText: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
  },
  sectionHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  sectionStack: {
    marginTop: 10,
    gap: 10,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  fieldValue: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  workItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  workDuration: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  linksWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  linkPill: {
    borderWidth: 1,
    borderRadius: 999,
    height: 30,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
  },
  linkText: {
    fontSize: 11,
    lineHeight: 14,
    maxWidth: 170,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 14,
  },
  logoutBtn: {
    borderWidth: 1,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  logoutBtnText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
