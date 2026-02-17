import React, { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Typography, Spacing, Layout } from "@/constants/DesignSystem";
import * as tribeApi from "@/lib/tribeApi";

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

  /* ── Fetch ─────────────────────────────────────────────────── */

  const fetchMembers = useCallback(async () => {
    if (!token || !tribeId) return;
    try {
      const data = await tribeApi.getTribeMembers(token, tribeId);
      const list = Array.isArray(data) ? data : [];
      setMembers(list);

      const me = list.find((m: any) => m.user_id === userId);
      setMyRole(me?.role ?? null);
    } catch (e: any) {
      console.error("[Members] Fetch:", e.message);
    }
  }, [token, tribeId, userId]);

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

  const handleAction = (member: any) => {
    if (!isAdmin) return;
    if (member.user_id === userId) return; // Can't modify self
    if (member.role === "owner") return; // Can't modify owner

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
    if (member.role === "moderator" && isOwner) {
      options.push("Promote to Admin");
      actions.push(() => changeRole(member.user_id, "admin"));
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

  const renderMember = ({ item: m }: { item: any }) => {
    const nameDisplay =
      m.profiles?.display_name ||
      m.profiles?.username ||
      m.user_id?.slice(0, 8);
    const isSelf = m.user_id === userId;
    const canModify = isAdmin && !isSelf && m.role !== "owner";

    return (
      <TouchableOpacity
        style={[
          styles.memberCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
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
          {m.profiles?.avatar_url ? (
            <Image
              source={{ uri: m.profiles.avatar_url }}
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
              <Text style={[styles.youTag, { color: theme.text.muted }]}>
                (you)
              </Text>
            )}
          </View>
          {m.profiles?.username && m.profiles?.display_name && (
            <Text
              style={[styles.username, { color: theme.text.tertiary }]}
              numberOfLines={1}
            >
              @{m.profiles.username}
            </Text>
          )}
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Members ({members.length})
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={members}
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
                No members found
              </Text>
            </View>
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
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { padding: Spacing.xxs },
  headerTitle: { ...Typography.presets.h3 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xs,
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
  memberName: { ...Typography.presets.body, fontWeight: "600" },
  youTag: { ...Typography.presets.caption },
  username: { ...Typography.presets.caption },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.presets.bodySmall },
});
