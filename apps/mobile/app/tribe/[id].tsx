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
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Typography, Spacing, Layout } from "@/constants/DesignSystem";
import * as tribeApi from "@/lib/tribeApi";
import { supabase } from "@/lib/supabase";
import MembershipGateModal from "@/components/MembershipGateModal";

/* ================================================================ */
/*  Tribe Detail Screen                                             */
/* ================================================================ */

export default function TribeDetailScreen() {
  const STORAGE_BUCKET = "tribe-media";
  const { id } = useLocalSearchParams<{ id: string }>();
  const tribeId = Array.isArray(id) ? id[0] : id;

  const router = useRouter();
  const { theme } = useTheme();
  const { session } = useAuth();
  const token = session?.access_token || "";
  const userId = session?.user?.id;
  const tribeCacheKey = `tribe:detail-cache:v1:${userId || "anon"}:${tribeId || "unknown"}`;

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
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [editAvatarPreview, setEditAvatarPreview] = useState("");
  const [editCoverPreview, setEditCoverPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<"" | "tribe-avatar" | "tribe-cover" | "group-avatar">("");

  // Membership gate modal
  const [showMembershipGate, setShowMembershipGate] = useState(false);

  // Create channel modal
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");
  const [channelAvatarUrl, setChannelAvatarUrl] = useState("");
  const [channelAvatarPreview, setChannelAvatarPreview] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [showEditChannel, setShowEditChannel] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editChannelName, setEditChannelName] = useState("");
  const [editChannelDesc, setEditChannelDesc] = useState("");
  const [savingChannel, setSavingChannel] = useState(false);

  const resolveMediaUrl = useCallback(
    async (raw: string) => {
      const value = (raw || "").trim();
      if (!value) return "";
      if (/^https?:\/\//i.test(value)) return value;
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(value, 60 * 60 * 24 * 30);
      if (error || !data?.signedUrl) return "";
      return `${data.signedUrl}&t=${Date.now()}`;
    },
    [],
  );

  const resolveProfileAvatarForUser = useCallback(
    async (uid: string, raw?: string) => {
      const direct = await resolveMediaUrl(raw || "");
      if (direct) return direct;
      if (!uid) return "";
      const folder = `profiles/${uid}`;
      const { data: files, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(folder, { limit: 20 });
      if (error || !Array.isArray(files) || files.length === 0) return "";
      const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
      if (!preferred?.name) return "";
      const fullPath = `${folder}/${preferred.name}`;
      return (await resolveMediaUrl(fullPath)) || "";
    },
    [resolveMediaUrl],
  );

  /* ── Data fetching ─────────────────────────────────────────── */

  const fetchAll = useCallback(async () => {
    if (!token || !tribeId) return;

    // 1. Tribe detail
    try {
      const t = await tribeApi.getTribe(token, tribeId);
      const avatarPreview = await resolveMediaUrl(t.avatar_url || "");
      const coverPreview = await resolveMediaUrl(t.cover_url || t.banner_url || "");
      setTribe({
        ...t,
        avatar_url: avatarPreview || t.avatar_url,
        cover_url: coverPreview || t.cover_url,
        banner_url: coverPreview || t.banner_url,
      });
      setEditName(t.name || "");
      setEditDesc(t.description || "");
      setEditAvatarUrl(t.avatar_url || "");
      setEditCoverUrl(t.cover_url || t.banner_url || "");
      setEditAvatarPreview(avatarPreview);
      setEditCoverPreview(coverPreview);
    } catch (e: any) {
      console.error("[TribeDetail] Fetch tribe:", e.message);
      return;
    }

    // 2. Check membership first via members endpoint
    let memberList: any[] = [];
    let userIsMember = false;
    try {
      const m = await tribeApi.getTribeMembers(token, tribeId);
      const rawMembers = Array.isArray(m) ? m : [];
      memberList = await Promise.all(
        rawMembers.map(async (mb: any) => {
          const rawPhoto = mb?.profiles?.avatar_url || mb?.profiles?.photo_url || "";
          const resolvedPhoto = await resolveProfileAvatarForUser(
            mb?.user_id || "",
            rawPhoto,
          );
          return {
            ...mb,
            profiles: {
              ...(mb?.profiles || {}),
              avatar_url: resolvedPhoto || rawPhoto || mb?.profiles?.avatar_url,
            },
          };
        }),
      );
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
      const rawGroups = Array.isArray(g) ? g : [];
      const resolvedGroups = await Promise.all(
        rawGroups.map(async (gr: any) => ({
          ...gr,
          avatar_url:
            (await resolveMediaUrl(gr.avatar_url || "")) || gr.avatar_url,
        })),
      );
      setGroups(resolvedGroups);
    } catch (e: any) {
      console.error("[TribeDetail] Fetch groups:", e.message);
      setGroups([]);
    }
  }, [resolveMediaUrl, resolveProfileAvatarForUser, token, tribeId, userId]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  useEffect(() => {
    if (!tribeId) return;
    let cancelled = false;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(tribeCacheKey);
        if (!cached) return;
        const parsed = JSON.parse(cached);
        if (cancelled) return;
        if (parsed?.tribe) {
          setTribe(parsed.tribe);
          setEditName(parsed.tribe.name || "");
          setEditDesc(parsed.tribe.description || "");
        }
        if (Array.isArray(parsed?.groups)) setGroups(parsed.groups);
        if (Array.isArray(parsed?.members)) setMembers(parsed.members);
        if (typeof parsed?.myRole === "string" || parsed?.myRole === null) setMyRole(parsed.myRole ?? null);
        if (typeof parsed?.isMember === "boolean") setIsMember(parsed.isMember);
        setLoading(false);
      } catch {
        // ignore cache failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tribeCacheKey, tribeId]);

  useEffect(() => {
    if (!tribeId) return;
    (async () => {
      try {
        await AsyncStorage.setItem(
          tribeCacheKey,
          JSON.stringify({
            tribe,
            groups,
            members,
            myRole,
            isMember,
            updatedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // ignore cache failures
      }
    })();
  }, [tribe, groups, members, myRole, isMember, tribeCacheKey, tribeId]);

  // Keep member count and other data fresh after navigating back from sub-screens.
  useFocusEffect(
    useCallback(() => {
      if (!token || !tribeId) return;
      fetchAll();
    }, [fetchAll, token, tribeId]),
  );

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
      try {
        await tribeApi.updateTribe(token, tribeId, {
          name: editName,
          description: editDesc,
          avatar_url: editAvatarUrl.trim() || null,
          cover_url: editCoverUrl.trim() || null,
        });
      } catch (e: any) {
        const msg = String(e?.message || "").toLowerCase();
        const coverFieldIssue =
          msg.includes("cover_url") || msg.includes("column") || msg.includes("schema");
        if (!coverFieldIssue) throw e;
        await tribeApi.updateTribe(token, tribeId, {
          name: editName,
          description: editDesc,
          avatar_url: editAvatarUrl.trim() || null,
        });
      }
      await fetchAll();
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
        avatar_url: channelAvatarUrl.trim() || undefined,
      });
      setChannelName("");
      setChannelDesc("");
      setChannelAvatarUrl("");
      setChannelAvatarPreview("");
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

  const openGroupActions = (group: any) => {
    if (!isAdmin) return;
    const actions: Array<{ text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }> = [
      {
        text: "Edit Channel",
        onPress: () => {
          setEditingGroup(group);
          setEditChannelName(group?.name || "");
          setEditChannelDesc(group?.description || "");
          // Keep URL unchanged unless user uploads a new image in edit flow.
          setChannelAvatarUrl("");
          setChannelAvatarPreview(group?.avatar_url || "");
          setShowEditChannel(true);
        },
      },
    ];
    if (isOwner) {
      actions.push({
        text: "Delete Channel",
        style: "destructive",
        onPress: () => handleDeleteGroup(group),
      });
    }
    actions.push({ text: "Cancel", style: "cancel" });
    Alert.alert(group?.name || "Channel", "Manage this channel", actions);
  };

  const handleSaveChannelEdits = async () => {
    if (!token || !tribeId || !editingGroup?.id || !editChannelName.trim()) return;
    setSavingChannel(true);
    try {
      await tribeApi.updateGroup(token, tribeId, editingGroup.id, {
        name: editChannelName.trim(),
        description: editChannelDesc.trim() || undefined,
        avatar_url: channelAvatarUrl.trim() || undefined,
      });
      setShowEditChannel(false);
      setEditingGroup(null);
      await fetchAll();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSavingChannel(false);
    }
  };

  const handleDeleteGroup = (group: any) => {
    if (!token || !tribeId || !group?.id || !isOwner) return;
    Alert.alert(
      "Delete Channel",
      `Delete "${group?.name || "this channel"}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await tribeApi.deleteGroup(token, tribeId, group.id);
              await fetchAll();
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ],
    );
  };

  const uploadTribeMedia = async (
    localUri: string,
    target: "avatar" | "cover" | "group",
  ) => {
    const ext = localUri.split(".").pop()?.toLowerCase() || "jpg";
    const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;
    const filePath =
      target === "group"
        ? `tribes/${tribeId}/groups/${Date.now()}.${ext}`
        : `tribes/${tribeId}/${target}.${ext}`;

    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();
    if (target !== "group") {
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
    }
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, arrayBuffer, { contentType, upsert: false });
    if (uploadError) throw uploadError;

    const signed = await resolveMediaUrl(filePath);
    return { filePath, signed };
  };

  const pickAndUpload = async (target: "tribe-avatar" | "tribe-cover" | "group-avatar") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: target === "tribe-cover" ? [16, 9] : [1, 1],
      quality: 0.75,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingMedia(target);
    try {
      const mode =
        target === "group-avatar"
          ? "group"
          : target === "tribe-cover"
            ? "cover"
            : "avatar";
      const { filePath, signed } = await uploadTribeMedia(result.assets[0].uri, mode);
      if (target === "tribe-avatar") {
        setEditAvatarUrl(filePath);
        setEditAvatarPreview(signed);
      } else if (target === "tribe-cover") {
        setEditCoverUrl(filePath);
        setEditCoverPreview(signed);
      } else {
        setChannelAvatarUrl(filePath);
        setChannelAvatarPreview(signed);
      }
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Could not upload image");
    } finally {
      setUploadingMedia("");
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
  const memberPreviewLimit = 10;
  const orderedGroups = [...groups].sort((a, b) => {
    const aReadonly = a?.is_readonly ? 1 : 0;
    const bReadonly = b?.is_readonly ? 1 : 0;
    if (aReadonly !== bReadonly) return bReadonly - aReadonly;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
  // Prefer live membership list count when available; fallback to tribe summary.
  const totalMembersCount = isMember
    ? members.length
    : Number(tribe?.member_count ?? members.length ?? 0);
  const tribeAvatar =
    (typeof tribe?.avatar_url === "string" && /^https?:\/\//i.test(tribe.avatar_url)
      ? tribe.avatar_url
      : "") || editAvatarPreview;
  const heroImage =
    tribe?.cover_url ||
    tribe?.banner_url ||
    tribe?.avatar_url ||
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1400&auto=format&fit=crop";

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

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
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroImage }} style={styles.heroImageBanner} resizeMode="cover" />
          <View style={styles.heroOverlay} />

          <TouchableOpacity
            style={[styles.floatingBtn, { left: Spacing.md }]}
            onPress={() => router.back()}
            activeOpacity={0.9}
          >
            <Ionicons name="chevron-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floatingBtn, { right: Spacing.md }]}
            onPress={() => (isAdmin ? setShowSettings(true) : handleGenerateInvite())}
            activeOpacity={0.9}
          >
            <Ionicons
              name={isAdmin ? "ellipsis-horizontal" : "share-social-outline"}
              size={20}
              color="#0f172a"
            />
          </TouchableOpacity>
        </View>

        {/* Tribe hero card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.surface, borderColor: theme.borderLight },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.heroIcon, { backgroundColor: theme.brand.primary + "12" }]}>
              {tribeAvatar ? (
                <Image source={{ uri: tribeAvatar }} style={styles.heroIconImage} />
              ) : (
                <Ionicons
                  name="shield-checkmark"
                  size={34}
                  color={theme.brand.primary}
                />
              )}
            </View>
            <View style={styles.heroTopRight}>
              <View style={[styles.verifiedPill, { backgroundColor: theme.brand.primary + "14" }]}>
                <Text style={[styles.verifiedPillText, { color: theme.brand.primary }]}>Verified Tribe</Text>
              </View>
              <Text style={[styles.memberCountText, { color: theme.text.tertiary }]}>
                {totalMembersCount.toLocaleString()} members
              </Text>
            </View>
          </View>
          <Text style={[styles.heroName, { color: theme.text.primary }]}>
            {tribe.name}
          </Text>
          {tribe.description ? (
            <Text style={[styles.heroDesc, { color: theme.text.secondary }]}>
              {tribe.description}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryCta,
              { backgroundColor: theme.brand.primary },
            ]}
            onPress={handleJoinLeave}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryCtaText, { color: theme.text.inverse }]}>
              {isMember ? "Leave Community" : "Join Community"}
            </Text>
            <Ionicons
              name={isMember ? "exit-outline" : "add"}
              size={18}
              color={theme.text.inverse}
            />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[
                styles.secondaryCta,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
              onPress={handleGenerateInvite}
              activeOpacity={0.85}
            >
              <Ionicons name="link-outline" size={17} color={theme.text.primary} />
              <Text style={[styles.secondaryCtaText, { color: theme.text.primary }]}>
                Invite Members
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Channels section ─────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons
              name="grid-outline"
              size={18}
              color={theme.text.tertiary}
            />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Browse Channels
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

        {orderedGroups.length === 0 ? (
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
          <View
            style={[
              styles.channelListCard,
              { backgroundColor: theme.surface, borderColor: theme.borderLight },
            ]}
          >
            {orderedGroups.map((g, idx) => {
              const iconTone =
                idx % 4 === 0
                  ? "#EA580C"
                  : idx % 4 === 1
                    ? "#2563EB"
                    : idx % 4 === 2
                      ? "#7C3AED"
                      : "#059669";
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.channelRow,
                    idx !== orderedGroups.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.border,
                    },
                  ]}
                  onPress={() => {
                    if (!isMember) {
                      setShowMembershipGate(true);
                      return;
                    }
                    router.push(`/tribe/chat/${g.id}?tribeId=${tribeId}` as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.channelIcon, { backgroundColor: iconTone + "18" }]}>
                    {g.avatar_url ? (
                      <Image source={{ uri: g.avatar_url }} style={styles.channelAvatarImg} />
                    ) : (
                      <Ionicons
                        name={g.is_readonly ? "megaphone-outline" : "chatbubble-ellipses-outline"}
                        size={18}
                        color={iconTone}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.channelNameRow}>
                      <Text
                        style={[styles.channelName, { color: theme.text.primary }]}
                        numberOfLines={1}
                      >
                        {g.name}
                      </Text>
                      {g.is_readonly ? <View style={styles.liveDot} /> : null}
                    </View>
                    <Text
                      style={[styles.channelDesc, { color: theme.text.tertiary }]}
                      numberOfLines={1}
                    >
                      {g.description || "Open channel for tribe members"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.text.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
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
                  Members ({totalMembersCount})
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.text.muted}
              />
            </TouchableOpacity>

            <View
              style={[
                styles.memberListCard,
                { backgroundColor: theme.surface, borderColor: theme.borderLight },
              ]}
            >
              {members.slice(0, memberPreviewLimit).map((m, idx) => (
                (() => {
                  const memberAvatarUrl =
                    m?.profiles?.avatar_url ||
                    m?.profiles?.photo_url ||
                    (m?.user_id === userId
                      ? session?.user?.user_metadata?.avatar_url || null
                      : null);
                  return (
                <View
                  key={m.user_id || m.id}
                  style={[
                    styles.memberRow,
                    idx !== Math.min(members.length, memberPreviewLimit) - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: theme.brand.primary + "12" },
                    ]}
                  >
                    {memberAvatarUrl ? (
                      <Image
                        source={{ uri: memberAvatarUrl }}
                        style={styles.memberAvatarImg}
                      />
                    ) : (
                      <Ionicons name="person" size={18} color={theme.brand.primary} />
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text
                      style={[styles.memberName, { color: theme.text.primary }]}
                      numberOfLines={1}
                    >
                      {m.profiles?.display_name ||
                        m.profiles?.username ||
                        m.user_id?.slice(0, 8)}
                    </Text>
                    <Text style={[styles.memberMeta, { color: theme.text.tertiary }]}>
                      {m.role === "owner"
                        ? "Community Owner"
                        : m.role === "admin"
                          ? "Community Admin"
                          : "Member"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor:
                          m.role === "owner"
                            ? theme.brand.primary + "16"
                            : m.role === "admin"
                              ? theme.brand.primary + "12"
                              : theme.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        {
                          color:
                            m.role === "owner" || m.role === "admin"
                              ? theme.brand.primary
                              : theme.text.tertiary,
                        },
                      ]}
                    >
                      {m.role}
                    </Text>
                  </View>
                </View>
                  );
                })()
              ))}
            </View>

            {members.length > memberPreviewLimit && (
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

            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Tribe photo
            </Text>
            <TouchableOpacity
              style={[styles.mediaPicker, { borderColor: theme.border, backgroundColor: theme.background }]}
              onPress={() => pickAndUpload("tribe-avatar")}
              activeOpacity={0.85}
              disabled={uploadingMedia === "tribe-avatar"}
            >
              {editAvatarPreview ? (
                <Image source={{ uri: editAvatarPreview }} style={styles.mediaAvatarPreview} />
              ) : (
                <Ionicons name="image-outline" size={20} color={theme.text.muted} />
              )}
              <Text style={[styles.mediaPickerText, { color: theme.text.primary }]}>
                {uploadingMedia === "tribe-avatar" ? "Uploading..." : "Upload tribe photo"}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Background photo
            </Text>
            <TouchableOpacity
              style={[styles.mediaPicker, { borderColor: theme.border, backgroundColor: theme.background }]}
              onPress={() => pickAndUpload("tribe-cover")}
              activeOpacity={0.85}
              disabled={uploadingMedia === "tribe-cover"}
            >
              {editCoverPreview ? (
                <Image source={{ uri: editCoverPreview }} style={styles.mediaCoverPreview} />
              ) : (
                <Ionicons name="images-outline" size={20} color={theme.text.muted} />
              )}
              <Text style={[styles.mediaPickerText, { color: theme.text.primary }]}>
                {uploadingMedia === "tribe-cover" ? "Uploading..." : "Upload background photo"}
              </Text>
            </TouchableOpacity>

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

      {/* ── Edit Channel Modal ────────────────────────── */}
      <Modal
        visible={showEditChannel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditChannel(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowEditChannel(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                Edit Channel
              </Text>
              <TouchableOpacity
                onPress={() => setShowEditChannel(false)}
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
              value={editChannelName}
              onChangeText={setEditChannelName}
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
              value={editChannelDesc}
              onChangeText={setEditChannelDesc}
            />

            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Channel photo (optional)
            </Text>
            <TouchableOpacity
              style={[styles.mediaPicker, { borderColor: theme.border, backgroundColor: theme.background }]}
              onPress={() => pickAndUpload("group-avatar")}
              activeOpacity={0.85}
              disabled={uploadingMedia === "group-avatar"}
            >
              {channelAvatarPreview ? (
                <Image source={{ uri: channelAvatarPreview }} style={styles.mediaAvatarPreview} />
              ) : (
                <Ionicons name="image-outline" size={20} color={theme.text.muted} />
              )}
              <Text style={[styles.mediaPickerText, { color: theme.text.primary }]}>
                {uploadingMedia === "group-avatar" ? "Uploading..." : "Upload channel photo"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: theme.brand.primary,
                  opacity: editChannelName.trim() ? 1 : 0.4,
                },
              ]}
              onPress={handleSaveChannelEdits}
              disabled={!editChannelName.trim() || savingChannel}
              activeOpacity={0.8}
            >
              {savingChannel ? (
                <ActivityIndicator color={theme.text.inverse} />
              ) : (
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: theme.text.inverse },
                  ]}
                >
                  Save Channel
                </Text>
              )}
            </TouchableOpacity>

            {isOwner && editingGroup ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteGroup(editingGroup)}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.error}
                />
                <Text
                  style={[styles.deleteBtnText, { color: theme.error }]}
                >
                  Delete Channel
                </Text>
              </TouchableOpacity>
            ) : null}
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

            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Channel photo (optional)
            </Text>
            <TouchableOpacity
              style={[styles.mediaPicker, { borderColor: theme.border, backgroundColor: theme.background }]}
              onPress={() => pickAndUpload("group-avatar")}
              activeOpacity={0.85}
              disabled={uploadingMedia === "group-avatar"}
            >
              {channelAvatarPreview ? (
                <Image source={{ uri: channelAvatarPreview }} style={styles.mediaAvatarPreview} />
              ) : (
                <Ionicons name="image-outline" size={20} color={theme.text.muted} />
              )}
              <Text style={[styles.mediaPickerText, { color: theme.text.primary }]}>
                {uploadingMedia === "group-avatar" ? "Uploading..." : "Upload channel photo"}
              </Text>
            </TouchableOpacity>

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

  scrollContent: { paddingBottom: 60 },
  heroWrap: {
    height: 320,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  heroImageBanner: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.28)",
  },
  floatingBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 42,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.84)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  /* Hero card */
  heroCard: {
    marginTop: -74,
    marginHorizontal: Spacing.lg,
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Layout.shadows.lg,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  heroTopRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  verifiedPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedPillText: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.1,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
  },
  memberCountText: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
    fontFamily: "Poppins_400Regular",
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  heroIconImage: {
    width: "100%",
    height: "100%",
  },
  heroName: {
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 8,
    letterSpacing: -0.3,
    fontFamily: "Poppins_600SemiBold",
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.md,
    letterSpacing: 0,
    fontFamily: "Poppins_400Regular",
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 15,
    paddingHorizontal: Spacing.md,
    borderRadius: 999,
    marginTop: 4,
  },
  primaryCtaText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.1,
    fontFamily: "Poppins_600SemiBold",
  },
  secondaryCta: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryCtaText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontFamily: "Poppins_500Medium",
  },

  /* Sections */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.15,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
  },

  /* Channels */
  channelListCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  channelIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  channelAvatarImg: {
    width: "100%",
    height: "100%",
  },
  channelNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  channelName: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.1,
    fontFamily: "Poppins_500Medium",
  },
  channelDesc: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
    fontFamily: "Poppins_400Regular",
  },
  channelActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6366F1",
  },

  /* Empty state */
  emptySub: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  emptySubText: { ...Typography.presets.bodySmall },

  /* Members */
  memberListCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  memberAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.1,
    fontFamily: "Poppins_500Medium",
  },
  memberMeta: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
    fontFamily: "Poppins_400Regular",
    marginTop: 1,
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
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
  },
  seeAll: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontFamily: "Poppins_500Medium",
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
  mediaPicker: {
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    padding: Spacing.sm,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  mediaPickerText: {
    ...Typography.presets.bodySmall,
    fontFamily: "Poppins_500Medium",
  },
  mediaAvatarPreview: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  mediaCoverPreview: {
    width: 52,
    height: 34,
    borderRadius: 8,
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
