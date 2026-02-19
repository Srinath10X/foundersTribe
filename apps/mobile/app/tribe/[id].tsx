import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  TextInput,
  Modal,
  Share,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Typography, Spacing, Layout } from "@/constants/DesignSystem";
import * as tribeApi from "@/lib/tribeApi";
import MembershipGateModal from "@/components/MembershipGateModal";

/* ================================================================ */
/*  Tribe Detail Screen                                             */
/* ================================================================ */

export default function TribeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tribeId = Array.isArray(id) ? id[0] : id;

  const router = useRouter();
  const { theme } = useTheme();
  const { session } = useAuth();
  const token = session?.access_token || "";
  const userId = session?.user?.id;

  /* ── State ─────────────────────────────────────────────────── */

  const [tribe, setTribe] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Membership gate modal
  const [showMembershipGate, setShowMembershipGate] = useState(false);

  // Create channel modal
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);

  /* ── Data fetching ─────────────────────────────────────────── */

  const fetchAll = useCallback(async () => {
    if (!token || !tribeId) return;

    // 1. Tribe detail
    try {
      const t = await tribeApi.getTribe(token, tribeId);
      setTribe(t);
      setEditName(t.name || "");
      setEditDesc(t.description || "");
    } catch (e: any) {
      console.error("[TribeDetail] Fetch tribe:", e.message);
      return;
    }

    // 2. Check membership first via members endpoint
    let memberList: any[] = [];
    let userIsMember = false;
    try {
      const m = await tribeApi.getTribeMembers(token, tribeId);
      memberList = Array.isArray(m) ? m : [];
      const me = memberList.find((mb: any) => mb.user_id === userId);
      userIsMember = !!me;
      setMembers(memberList);
      setIsMember(userIsMember);
      setMyRole(me?.role ?? null);
    } catch (e: any) {
      if (!e.message?.includes("Not a member")) {
        console.error("[TribeDetail] Fetch members:", e.message);
      }
      setMembers([]);
      setIsMember(false);
      setMyRole(null);
    }

    // 3. Groups — use member endpoint if member, public endpoint otherwise
    try {
      const g = userIsMember
        ? await tribeApi.getGroups(token, tribeId)
        : await tribeApi.getGroupsPublic(token, tribeId);
      setGroups(Array.isArray(g) ? g : []);
    } catch (e: any) {
      console.error("[TribeDetail] Fetch groups:", e.message);
      setGroups([]);
    }
  }, [token, tribeId, userId]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  /* ── Handlers ──────────────────────────────────────────────── */

  const handleJoinLeave = async () => {
    if (!token || !tribeId) return;
    try {
      if (isMember) {
        Alert.alert("Leave Tribe", "Are you sure you want to leave?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: async () => {
              await tribeApi.leaveTribe(token, tribeId);
              router.back();
            },
          },
        ]);
      } else {
        await tribeApi.joinTribe(token, tribeId);
        await fetchAll();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleSaveSettings = async () => {
    if (!token || !tribeId) return;
    setSaving(true);
    try {
      await tribeApi.updateTribe(token, tribeId, {
        name: editName,
        description: editDesc,
      });
      setTribe((prev: any) => ({
        ...prev,
        name: editName,
        description: editDesc,
      }));
      setShowSettings(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTribe = () => {
    Alert.alert(
      "Delete Tribe",
      "This is irreversible. All channels and data will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await tribeApi.deleteTribe(token, tribeId!);
              router.back();
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ],
    );
  };

  const handleCreateChannel = async () => {
    if (!token || !tribeId || !channelName.trim()) return;
    setCreatingChannel(true);
    try {
      await tribeApi.createGroup(token, tribeId, {
        name: channelName.trim(),
        description: channelDesc.trim() || undefined,
      });
      setChannelName("");
      setChannelDesc("");
      setShowCreateChannel(false);
      await fetchAll();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!token || !tribeId) return;
    try {
      const invite = await tribeApi.createInvite(token, tribeId);
      const code = invite?.code || invite?.id || JSON.stringify(invite);
      Alert.alert("Invite Code", code, [
        {
          text: "Share",
          onPress: () =>
            Share.share({ message: `Join my tribe with code: ${code}` }),
        },
        { text: "OK" },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  /* ── Loading / Error states ────────────────────────────────── */

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  if (!tribe) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={theme.text.muted}
        />
        <Text
          style={[
            styles.errorText,
            { color: theme.text.secondary, marginTop: Spacing.sm },
          ]}
        >
          Tribe not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backLink,
            { backgroundColor: theme.surfaceElevated },
          ]}
        >
          <Text style={[styles.backLinkText, { color: theme.text.primary }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAdmin = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ─────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.headerTitle, { color: theme.text.primary }]}
            numberOfLines={1}
          >
            {tribe.name}
          </Text>
          <Text style={[styles.headerSub, { color: theme.text.tertiary }]}>
            {tribe.member_count ?? members.length} member{(tribe.member_count ?? members.length) !== 1 ? "s" : ""}
          </Text>
        </View>
        {isAdmin && (
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <Ionicons
              name="settings-outline"
              size={22}
              color={theme.text.secondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Body ───────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.brand.primary}
          />
        }
      >
        {/* Tribe hero card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: theme.brand.primary + "18" },
            ]}
          >
            <Ionicons
              name="shield-half"
              size={44}
              color={theme.brand.primary}
            />
          </View>
          <Text style={[styles.heroName, { color: theme.text.primary }]}>
            {tribe.name}
          </Text>
          {tribe.description ? (
            <Text style={[styles.heroDesc, { color: theme.text.secondary }]}>
              {tribe.description}
            </Text>
          ) : null}

          {/* Action row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isMember
                    ? theme.surfaceElevated
                    : theme.brand.primary,
                },
              ]}
              onPress={handleJoinLeave}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isMember ? "exit-outline" : "enter-outline"}
                size={18}
                color={isMember ? theme.text.primary : theme.text.inverse}
              />
              <Text
                style={[
                  styles.actionText,
                  {
                    color: isMember
                      ? theme.text.primary
                      : theme.text.inverse,
                  },
                ]}
              >
                {isMember ? "Leave" : "Join"}
              </Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.surfaceElevated },
                ]}
                onPress={handleGenerateInvite}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="link-outline"
                  size={18}
                  color={theme.text.primary}
                />
                <Text
                  style={[styles.actionText, { color: theme.text.primary }]}
                >
                  Invite
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Channels section ─────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons
              name="chatbubbles-outline"
              size={18}
              color={theme.text.primary}
            />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Channels
            </Text>
          </View>
          {isAdmin && (
            <TouchableOpacity onPress={() => setShowCreateChannel(true)}>
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={theme.brand.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {groups.length === 0 ? (
          <View style={styles.emptySub}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={28}
              color={theme.text.muted}
            />
            <Text style={[styles.emptySubText, { color: theme.text.muted }]}>
              No channels yet
            </Text>
          </View>
        ) : (
          groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[
                styles.channelCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
              onPress={() => {
                if (!isMember) {
                  setShowMembershipGate(true);
                  return;
                }
                router.push(
                  `/tribe/chat/${g.id}?tribeId=${tribeId}` as any,
                );
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.channelIcon,
                  { backgroundColor: theme.brand.primary + "12" },
                ]}
              >
                <Ionicons
                  name={
                    g.is_readonly
                      ? "megaphone-outline"
                      : "chatbubble-outline"
                  }
                  size={18}
                  color={theme.brand.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.channelName, { color: theme.text.primary }]}
                  numberOfLines={1}
                >
                  {g.name}
                </Text>
                {g.description ? (
                  <Text
                    style={[
                      styles.channelDesc,
                      { color: theme.text.tertiary },
                    ]}
                    numberOfLines={1}
                  >
                    {g.description}
                  </Text>
                ) : null}
              </View>
              {g.is_readonly && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.brand.primary + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: theme.brand.primary },
                    ]}
                  >
                    Announce
                  </Text>
                </View>
              )}
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.text.muted}
              />
            </TouchableOpacity>
          ))
        )}

        {/* ── Members section (only for members) ───────── */}
        {isMember && (
          <>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() =>
                router.push(`/tribe/members/${tribeId}` as any)
              }
            >
              <View style={styles.sectionLeft}>
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={theme.text.primary}
                />
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                  Members ({tribe.member_count ?? members.length})
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.text.muted}
              />
            </TouchableOpacity>

            {members.slice(0, 5).map((m) => (
              <View
                key={m.user_id || m.id}
                style={[styles.memberRow, { borderBottomColor: theme.border }]}
              >
                <View
                  style={[
                    styles.memberAvatar,
                    { backgroundColor: theme.brand.primary + "12" },
                  ]}
                >
                  {m.profiles?.avatar_url ? (
                    <Image
                      source={{ uri: m.profiles.avatar_url }}
                      style={styles.memberAvatarImg}
                    />
                  ) : (
                    <Ionicons
                      name="person"
                      size={16}
                      color={theme.brand.primary}
                    />
                  )}
                </View>
                <Text
                  style={[styles.memberName, { color: theme.text.primary }]}
                  numberOfLines={1}
                >
                  {m.profiles?.display_name ||
                    m.profiles?.username ||
                    m.user_id?.slice(0, 8)}
                </Text>
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor:
                        m.role === "owner"
                          ? theme.brand.primary + "20"
                          : theme.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      {
                        color:
                          m.role === "owner"
                            ? theme.brand.primary
                            : theme.text.tertiary,
                      },
                    ]}
                  >
                    {m.role}
                  </Text>
                </View>
              </View>
            ))}

            {members.length > 5 && (
              <TouchableOpacity
                onPress={() =>
                  router.push(`/tribe/members/${tribeId}` as any)
                }
              >
                <Text
                  style={[styles.seeAll, { color: theme.brand.primary }]}
                >
                  See all members →
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Settings Modal ─────────────────────────────── */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowSettings(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                Tribe Settings
              </Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text.primary,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.multiline,
                {
                  color: theme.text.primary,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: theme.brand.primary,
                  opacity: editName.trim() ? 1 : 0.4,
                },
              ]}
              onPress={handleSaveSettings}
              disabled={saving || !editName.trim()}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={theme.text.inverse} />
              ) : (
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: theme.text.inverse },
                  ]}
                >
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDeleteTribe}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.error}
                />
                <Text
                  style={[styles.deleteBtnText, { color: theme.error }]}
                >
                  Delete Tribe
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Create Channel Modal ───────────────────────── */}
      <Modal
        visible={showCreateChannel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateChannel(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCreateChannel(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                New Channel
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateChannel(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Channel name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text.primary,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              placeholder="e.g. general"
              placeholderTextColor={theme.text.muted}
              value={channelName}
              onChangeText={setChannelName}
              autoFocus
            />

            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Description (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text.primary,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              placeholder="What is this channel for?"
              placeholderTextColor={theme.text.muted}
              value={channelDesc}
              onChangeText={setChannelDesc}
            />

            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: theme.brand.primary,
                  opacity: channelName.trim() ? 1 : 0.4,
                },
              ]}
              onPress={handleCreateChannel}
              disabled={!channelName.trim() || creatingChannel}
              activeOpacity={0.8}
            >
              {creatingChannel ? (
                <ActivityIndicator color={theme.text.inverse} />
              ) : (
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: theme.text.inverse },
                  ]}
                >
                  Create Channel
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Membership Gate Dialog ──────────────────────── */}
      <MembershipGateModal
        visible={showMembershipGate}
        onClose={() => setShowMembershipGate(false)}
        onJoin={async () => {
          setShowMembershipGate(false);
          await handleJoinLeave();
        }}
      />
    </View>
  );
}

/* ================================================================ */
/*  Styles                                                          */
/* ================================================================ */

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  errorText: { ...Typography.presets.body, textAlign: "center" },
  backLink: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.radius.md,
  },
  backLinkText: { ...Typography.presets.body, fontWeight: "600" },

  /* Header */
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
  headerSub: { ...Typography.presets.caption },

  scrollContent: { padding: Spacing.lg, paddingBottom: 60 },

  /* Hero card */
  heroCard: {
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  heroName: {
    ...Typography.presets.h1,
    textAlign: "center",
    marginBottom: 4,
  },
  heroDesc: {
    ...Typography.presets.body,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.radius.md,
  },
  actionText: { ...Typography.presets.bodySmall, fontWeight: "600" },

  /* Sections */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  sectionTitle: { ...Typography.presets.h3 },

  /* Channels */
  channelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  channelIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  channelName: { ...Typography.presets.body, fontWeight: "600" },
  channelDesc: { ...Typography.presets.caption },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },

  /* Empty state */
  emptySub: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  emptySubText: { ...Typography.presets.bodySmall },

  /* Members */
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  memberAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  memberName: { ...Typography.presets.body, flex: 1 },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: { ...Typography.presets.caption, fontWeight: "600" },
  seeAll: {
    ...Typography.presets.bodySmall,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },

  /* Modals */
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: { ...Typography.presets.h2 },
  label: {
    ...Typography.presets.caption,
    fontWeight: "600",
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    padding: Spacing.sm,
    ...Typography.presets.body,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  saveBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Layout.radius.md,
    alignItems: "center",
  },
  saveBtnText: { ...Typography.presets.body, fontWeight: "600" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  deleteBtnText: { ...Typography.presets.body, fontWeight: "600" },
});
