import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ActionSheetIOS,
  Image,
  TextInput,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Typography, Spacing, Layout } from "@/constants/DesignSystem";
import * as tribeApi from "@/lib/tribeApi";
import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET = "tribe-media";

/* ================================================================ */
/*  Members Management Screen                                       */
/* ================================================================ */

export default function MembersScreen() {
  const { tribeId: rawId } = useLocalSearchParams<{ tribeId: string }>();
  const tribeId = Array.isArray(rawId) ? rawId[0] : rawId;

  const router = useRouter();
  const { theme } = useTheme();
  const { session } = useAuth();
  const token = session?.access_token || "";
  const userId = session?.user?.id;

  const [members, setMembers] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const resolveAvatarUrl = useCallback(async (raw?: string) => {
    const value = (raw || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(value, 60 * 60 * 24 * 30);
    if (error || !data?.signedUrl) return "";
    return `${data.signedUrl}&t=${Date.now()}`;
  }, []);

  const resolveAvatarFromProfileFolder = useCallback(
    async (uid: string) => {
      if (!uid) return "";
      const folder = `profiles/${uid}`;
      const { data: files, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(folder, { limit: 20 });
      if (error || !Array.isArray(files) || files.length === 0) return "";
      const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
      if (!preferred?.name) return "";
      const fullPath = `${folder}/${preferred.name}`;
      return (await resolveAvatarUrl(fullPath)) || "";
    },
    [resolveAvatarUrl],
  );

  /* ── Fetch ─────────────────────────────────────────────────── */

  const fetchMembers = useCallback(async () => {
    if (!token || !tribeId) return;
    try {
      const data = await tribeApi.getTribeMembers(token, tribeId);
      const rawList = Array.isArray(data) ? data : [];
      const list = await Promise.all(
        rawList.map(async (m: any) => {
          const uid = m?.user_id || "";
          const initialRaw =
            m?.profiles?.avatar_url ||
            m?.profiles?.photo_url ||
            "";
          let resolved =
            (await resolveAvatarUrl(initialRaw)) ||
            (await resolveAvatarFromProfileFolder(uid));
          if (!resolved && uid) {
            try {
              const p = await tribeApi.getPublicProfile(token, uid);
              const publicRaw =
                p?.avatar_url ||
                p?.photo_url ||
                "";
              resolved =
                (await resolveAvatarUrl(publicRaw)) ||
                (await resolveAvatarFromProfileFolder(uid));
            } catch {
              // noop
            }
          }
          return {
            ...m,
            profiles: {
              ...(m?.profiles || {}),
              avatar_url:
                resolved ||
                initialRaw ||
                m?.profiles?.avatar_url,
            },
          };
        }),
      );
      setMembers(list);

      const me = list.find((m: any) => m.user_id === userId);
      setMyRole(me?.role ?? null);
    } catch (e: any) {
      console.error("[Members] Fetch:", e.message);
    }
  }, [token, tribeId, userId, resolveAvatarUrl, resolveAvatarFromProfileFolder]);

  useEffect(() => {
    setLoading(true);
    fetchMembers().finally(() => setLoading(false));
  }, [fetchMembers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  };

  /* ── Actions ───────────────────────────────────────────────── */

  const isAdmin = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const canManageMember = useCallback(
    (member: any) => {
      if (!isAdmin) return false;
      if (member.user_id === userId) return false;
      if (member.role === "owner") return false;
      if (isOwner) return true;
      // Admin can only manage moderator/member roles.
      return member.role === "moderator" || member.role === "member";
    },
    [isAdmin, isOwner, userId],
  );

  const handleAction = (member: any) => {
    if (!canManageMember(member)) return;

    const options: string[] = [];
    const actions: (() => void)[] = [];

    // Role promotions (owner can do all, admin can promote members to moderator)
    if (member.role === "member") {
      if (isOwner) {
        options.push("Promote to Admin");
        actions.push(() => changeRole(member.user_id, "admin"));
      }
      options.push("Promote to Moderator");
      actions.push(() => changeRole(member.user_id, "moderator"));
    }
    if (member.role === "moderator") {
      if (isOwner) {
        options.push("Promote to Admin");
        actions.push(() => changeRole(member.user_id, "admin"));
      }
      options.push("Demote to Member");
      actions.push(() => changeRole(member.user_id, "member"));
    }
    if (member.role === "admin" && isOwner) {
      options.push("Demote to Moderator");
      actions.push(() => changeRole(member.user_id, "moderator"));
      options.push("Demote to Member");
      actions.push(() => changeRole(member.user_id, "member"));
    }

    options.push("Remove from Tribe");
    actions.push(() => removeMemberAction(member.user_id));

    options.push("Cancel");

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: options.length - 2, // Remove
          cancelButtonIndex: options.length - 1,
        },
        (idx) => {
          if (idx < actions.length) actions[idx]();
        },
      );
    } else {
      Alert.alert(
        "Member Actions",
        `Choose action for ${member.profiles?.display_name || member.user_id?.slice(0, 8)}`,
        [
          ...actions.map((fn, i) => ({
            text: options[i],
            onPress: fn,
            style: (options[i] === "Remove from Tribe"
              ? "destructive"
              : "default") as any,
          })),
          { text: "Cancel", style: "cancel" as const },
        ],
      );
    }
  };

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((m) => {
      const name = (m.profiles?.display_name || "").toLowerCase();
      const username = (m.profiles?.username || "").toLowerCase();
      const role = (m.role || "").toLowerCase();
      const idFrag = (m.user_id || "").toLowerCase();
      return (
        name.includes(query) ||
        username.includes(query) ||
        role.includes(query) ||
        idFrag.includes(query)
      );
    });
  }, [members, searchQuery]);

  const changeRole = async (targetUserId: string, role: "admin" | "moderator" | "member") => {
    try {
      await tribeApi.changeRole(token, tribeId!, targetUserId, role);
      await fetchMembers();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const removeMemberAction = (targetUserId: string) => {
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await tribeApi.removeMember(token, tribeId!, targetUserId);
              await fetchMembers();
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ],
    );
  };

  /* ── Render ────────────────────────────────────────────────── */

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return "star";
      case "admin":
        return "shield-checkmark";
      case "moderator":
        return "shield-half";
      default:
        return "person";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "#F59E0B"; // amber
      case "admin":
        return theme.brand.primary;
      case "moderator":
        return "#8B5CF6"; // purple
      default:
        return theme.text.tertiary;
    }
  };

  const renderMember = ({ item: m, index }: { item: any; index: number }) => {
    const memberAvatarUrl =
      m?.profiles?.avatar_url ||
      m?.profiles?.photo_url ||
      null;
    const nameDisplay =
      m.profiles?.display_name ||
      m.profiles?.username ||
      m.user_id?.slice(0, 8);
    const isSelf = m.user_id === userId;
    const canModify = canManageMember(m);
    const isFirst = index === 0;
    const isLast = index === filteredMembers.length - 1;
    const roleLabel =
      m.role === "owner"
        ? "Community Owner"
        : m.role === "admin"
          ? "Community Admin"
          : m.role === "moderator"
            ? "Moderator"
            : "Member";

    return (
      <TouchableOpacity
        style={[
          styles.memberRow,
          {
            backgroundColor: theme.surface,
            borderColor: theme.borderLight,
            borderTopLeftRadius: isFirst ? 24 : 0,
            borderTopRightRadius: isFirst ? 24 : 0,
            borderBottomLeftRadius: isLast ? 24 : 0,
            borderBottomRightRadius: isLast ? 24 : 0,
            marginTop: isFirst ? 0 : -StyleSheet.hairlineWidth,
          },
        ]}
        onPress={() => (canModify ? handleAction(m) : undefined)}
        disabled={!canModify}
        activeOpacity={canModify ? 0.7 : 1}
      >
        <View
          style={[
            styles.memberAvatar,
            { backgroundColor: getRoleColor(m.role) + "18" },
          ]}
        >
          {memberAvatarUrl ? (
            <Image
              source={{ uri: memberAvatarUrl }}
              style={styles.memberAvatarImg}
            />
          ) : (
            <Ionicons
              name={getRoleIcon(m.role)}
              size={20}
              color={getRoleColor(m.role)}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.memberName, { color: theme.text.primary }]}
              numberOfLines={1}
            >
              {nameDisplay}
            </Text>
            {isSelf && (
              <Text style={[styles.youTag, { color: theme.brand.primary }]}>YOU</Text>
            )}
          </View>
          <Text style={[styles.memberMeta, { color: theme.text.tertiary }]} numberOfLines={1}>
            {m.profiles?.username ? `@${m.profiles.username}  -  ` : ""}
            {roleLabel}
          </Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: getRoleColor(m.role) + "18" },
          ]}
        >
          <Text
            style={[styles.roleText, { color: getRoleColor(m.role) }]}
          >
            {m.role}
          </Text>
        </View>
        {canModify && (
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={theme.text.muted}
            style={{ marginLeft: 4 }}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Members</Text>
          <Text style={[styles.headerSub, { color: theme.text.tertiary }]}>
            {members.length.toLocaleString()} people in this tribe
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={theme.text.muted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text.primary }]}
          placeholder="Search members..."
          placeholderTextColor={theme.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.text.muted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMember}
          keyExtractor={(item, idx) =>
            item.user_id || item.id || `member-${idx}`
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.brand.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={48}
                color={theme.text.muted}
              />
              <Text
                style={[styles.emptyText, { color: theme.text.tertiary }]}
              >
                {searchQuery.trim()
                  ? "No matching members found"
                  : "No members found"}
              </Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>
              ALL MEMBERS
            </Text>
          }
        />
      )}
    </View>
  );
}

/* ================================================================ */
/*  Styles                                                          */
/* ================================================================ */

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { padding: Spacing.xxs, marginRight: 2 },
  headerTitle: {
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
    fontFamily: "Poppins_500Medium",
  },
  headerSub: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
    fontFamily: "Poppins_400Regular",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
    fontFamily: "Poppins_400Regular",
  },
  sectionLabel: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.15,
    fontFamily: "Poppins_500Medium",
    textTransform: "uppercase",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  memberAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberName: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.1,
    fontFamily: "Poppins_500Medium",
  },
  youTag: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
    fontFamily: "Poppins_500Medium",
  },
  memberMeta: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
    fontFamily: "Poppins_400Regular",
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
    fontFamily: "Poppins_500Medium",
    textTransform: "uppercase",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0,
    fontFamily: "Poppins_400Regular",
  },
});
