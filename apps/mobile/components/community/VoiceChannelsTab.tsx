import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { io, Socket } from "socket.io-client";

import CreateRoomModal from "../CreateRoomModal";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { VOICE_API_URL } from "../../lib/livekit";
import { Typography, Spacing, Layout } from "../../constants/DesignSystem";

interface RoomItem {
  id: string;
  title: string;
  type: "public" | "private";
  host_id: string;
  participant_count: number;
  is_active: boolean;
  created_at?: string;
}

type TabMode = "public" | "private";
type VoiceChannelsTabProps = {
  subTabVisible?: boolean;
};

/* ── Helpers ──────────────────────────────────────────────── */

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

async function createRoomViaREST(
  title: string,
  type: "public" | "private",
  authToken: string,
): Promise<{ room: RoomItem }> {
  const res = await fetch(`${VOICE_API_URL}/api/create_room`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ title, type }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create room");
  }
  return res.json();
}

/* ── Live Pulse ───────────────────────────────────────────── */

function LivePulse({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={pulseStyles.wrap}>
      <Animated.View
        style={[pulseStyles.outer, { backgroundColor: color, opacity: pulse }]}
      />
      <View style={[pulseStyles.inner, { backgroundColor: color }]} />
    </View>
  );
}

const pulseStyles = StyleSheet.create({
  wrap: { width: 20, height: 20, justifyContent: "center", alignItems: "center", marginTop: 2 },
  outer: { position: "absolute", width: 16, height: 16, borderRadius: 8 },
  inner: { width: 8, height: 8, borderRadius: 4 },
});

/* ================================================================ */
/*  Voice Channels Tab                                               */
/* ================================================================ */

export default function VoiceChannelsTab({
  subTabVisible = true,
}: VoiceChannelsTabProps) {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState<TabMode>("public");
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const currentUserId = session?.user?.id;
  const authToken = session?.access_token;

  /* ── Socket.io connection ───────────────────────────────── */

  useEffect(() => {
    if (!authToken) return;

    const socket = io(VOICE_API_URL, {
      transports: ["websocket"],
      auth: { token: authToken },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setError(null);
      fetchRooms();
    });

    socket.on("connect_error", (err) => {
      setError("Unable to connect to voice server");
      setLoading(false);
    });

    socket.on(
      "room_created",
      (data: { room: RoomItem; participant_count: number }) => {
        setRooms((prev) => {
          if (prev.some((r) => r.id === data.room.id)) return prev;
          return [
            { ...data.room, participant_count: data.participant_count },
            ...prev,
          ];
        });
      },
    );

    socket.on(
      "room_updated",
      (data: { roomId: string; participant_count: number }) => {
        setRooms((prev) =>
          prev.map((r) =>
            r.id === data.roomId
              ? { ...r, participant_count: data.participant_count }
              : r,
          ),
        );
      },
    );

    socket.on("room_removed", (data: { roomId: string }) => {
      setRooms((prev) => prev.filter((r) => r.id !== data.roomId));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authToken]);

  /* ── Fetch rooms ────────────────────────────────────────── */

  const fetchRooms = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${VOICE_API_URL}/api/get_all_available_rooms`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
        setError(null);
      } else {
        setError("Failed to load rooms");
      }
    } catch (err) {
      setError("Network error — pull to retry");
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}` as any);
  };

  const handleCreateRoom = async (roomName: string, isPublic: boolean) => {
    if (!authToken) return;
    try {
      const result = await createRoomViaREST(
        roomName,
        isPublic ? "public" : "private",
        authToken,
      );
      setCreateModalVisible(false);
      router.push(`/room/${result.room.id}` as any);
    } catch (err: any) {
      console.error("[VoiceChannels] Create room failed:", err.message);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchRooms();
  };

  /* ── Derived data ───────────────────────────────────────── */

  const publicRooms = rooms.filter((r) => r.type === "public");
  const privateRooms = rooms.filter(
    (r) => r.type === "private" || r.host_id === currentUserId,
  );
  const displayedRooms = activeTab === "public" ? publicRooms : privateRooms;

  const accentGlow = theme.brand.primary + "20";
  const accentBorder = theme.brand.primary + "40";

  /* ── Room card ──────────────────────────────────────────── */

  const RoomCard = ({ room }: { room: RoomItem }) => {
    const isHost = room.host_id === currentUserId;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
          },
        ]}
        onPress={() => handleJoinRoom(room.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.roomIcon, { backgroundColor: "#EAEAEA" }]}>
            <Image
              source={{ uri: `https://picsum.photos/seed/${room.id}/200/200` }}
              style={styles.roomIconImg}
            />
          </View>

          <View style={styles.cardTitleWrap}>
            <Text
              style={[styles.roomTitle, { color: theme.text.primary }]}
              numberOfLines={2}
            >
              {room.title}
            </Text>
            {room.created_at && (
              <Text style={[styles.timeAgo, { color: theme.text.tertiary }]}>
                {timeAgo(room.created_at)}
              </Text>
            )}
          </View>

          {room.participant_count > 0 && <LivePulse color={theme.success} />}
        </View>

        <View style={styles.cardBottomRow}>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons
                name="people-outline"
                size={14}
                color={theme.text.tertiary}
              />
              <Text
                style={[styles.metaChipText, { color: theme.text.tertiary }]}
              >
                {room.participant_count} listening
              </Text>
            </View>

            {isHost && (
              <View
                style={[
                  styles.chipBadge,
                  { backgroundColor: theme.brand.primary + "20" },
                ]}
              >
                <Ionicons name="star" size={10} color={theme.brand.primary} />
                <Text
                  style={[
                    styles.chipBadgeText,
                    { color: theme.brand.primary },
                  ]}
                >
                  Host
                </Text>
              </View>
            )}

            <View
              style={[
                styles.chipBadge,
                {
                  backgroundColor:
                    room.type === "public"
                      ? theme.success + "15"
                      : theme.info + "15",
                },
              ]}
            >
              <Ionicons
                name={
                  room.type === "public" ? "globe-outline" : "shield-outline"
                }
                size={10}
                color={room.type === "public" ? theme.success : theme.info}
              />
              <Text
                style={[
                  styles.chipBadgeText,
                  {
                    color:
                      room.type === "public" ? theme.success : theme.info,
                  },
                ]}
              >
                {room.type === "public" ? "Public" : "Private"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.joinBtn,
              {
                backgroundColor: isHost
                  ? theme.surfaceElevated
                  : theme.brand.primary,
                borderWidth: isHost ? 1 : 0,
                borderColor: theme.border,
              },
            ]}
            onPress={() => handleJoinRoom(room.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isHost ? "enter-outline" : "headset-outline"}
              size={14}
              color={isHost ? theme.text.primary : theme.text.inverse}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.joinBtnText,
                {
                  color: isHost ? theme.text.primary : theme.text.inverse,
                },
              ]}
            >
              {isHost ? "Rejoin" : "Tune In"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  /* ── Empty state ────────────────────────────────────────── */

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: accentGlow }]}>
        <Ionicons
          name={
            activeTab === "public" ? "radio-outline" : "lock-closed-outline"
          }
          size={40}
          color={theme.brand.primary}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
        {activeTab === "public" ? "No live rooms" : "No private rooms"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
        {activeTab === "public"
          ? "Start a conversation — create the first room and invite others to join."
          : "Create a private room to have an invite-only conversation."}
      </Text>
      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: theme.brand.primary }]}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={18} color={theme.text.inverse} />
        <Text style={[styles.ctaBtnText, { color: theme.text.inverse }]}>
          Create Room
        </Text>
      </TouchableOpacity>
    </View>
  );

  /* ── Error state ────────────────────────────────────────── */

  const ErrorState = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[styles.emptyIconWrap, { backgroundColor: theme.error + "15" }]}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={40}
          color={theme.error}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
        Connection Issue
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
        {error}
      </Text>
      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: theme.brand.primary }]}
        onPress={handleRetry}
        activeOpacity={0.8}
      >
        <Ionicons
          name="refresh-outline"
          size={18}
          color={theme.text.inverse}
        />
        <Text style={[styles.ctaBtnText, { color: theme.text.inverse }]}>
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  );

  /* ── Tab button ─────────────────────────────────────────── */

  const TabButton = ({
    tab,
    label,
    count,
    icon,
  }: {
    tab: TabMode;
    label: string;
    count: number;
    icon: string;
  }) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[
          styles.tabBtn,
          isActive && { backgroundColor: theme.brand.primary },
        ]}
        onPress={() => setActiveTab(tab)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={icon as any}
          size={15}
          color={isActive ? theme.text.inverse : theme.text.tertiary}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            styles.tabBtnText,
            { color: theme.text.secondary },
            isActive && { color: theme.text.inverse, fontWeight: "600" },
          ]}
        >
          {label}
        </Text>
        {count > 0 && (
          <View
            style={[
              styles.tabBadge,
              {
                backgroundColor: isActive
                  ? "rgba(255,255,255,0.25)"
                  : theme.brand.primary + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.tabBadgeText,
                {
                  color: isActive ? theme.text.inverse : theme.brand.primary,
                },
              ]}
            >
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <View style={styles.container}>
      {/* Live count */}
      {rooms.length > 0 && (
        <View style={styles.liveRow}>
          <View
            style={[styles.liveCountDot, { backgroundColor: theme.success }]}
          />
          <Text style={[styles.liveCountText, { color: theme.text.tertiary }]}>
            {rooms.length} live
          </Text>
        </View>
      )}

      {/* Segmented Control */}
      <View
        style={[styles.segmentedControl, { backgroundColor: theme.surface }]}
      >
        <TabButton
          tab="public"
          label="Public"
          count={publicRooms.length}
          icon="globe-outline"
        />
        <TabButton
          tab="private"
          label="Private"
          count={privateRooms.length}
          icon="lock-closed-outline"
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
          <Text style={[styles.loadingText, { color: theme.text.tertiary }]}>
            Finding rooms…
          </Text>
        </View>
      ) : error && rooms.length === 0 ? (
        <ErrorState />
      ) : (
        <FlatList
          data={displayedRooms}
          renderItem={({ item }) => <RoomCard room={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.brand.primary}
            />
          }
        />
      )}

      {/* FAB — Create Room */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: subTabVisible ? 180 : 124 },
          { backgroundColor: theme.brand.primary },
          Layout.shadows.lg,
        ]}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="mic-outline" size={26} color={theme.text.inverse} />
      </TouchableOpacity>

      {/* Create Room Modal */}
      <CreateRoomModal
        isVisible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreateRoom}
      />
    </View>
  );
}

/* ================================================================ */
/*  Styles                                                           */
/* ================================================================ */

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Live count */
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  liveCountDot: { width: 8, height: 8, borderRadius: 4 },
  liveCountText: { ...Typography.presets.caption },

  /* Tabs */
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 30, // Much more rounded pill shape
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.xxs,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26, // Rounded inner active button
  },
  tabBtnText: { ...Typography.presets.body },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: Layout.radius.full,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeText: {
    ...Typography.presets.caption,
    fontSize: 11,
    fontWeight: "700",
  },

  /* List */
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },

  /* Card */
  card: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.15)",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: 22, // Perfectly circular
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
    overflow: "hidden",
  },
  roomIconImg: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  cardTitleWrap: { flex: 1, marginRight: Spacing.xs },
  roomTitle: {
    ...Typography.presets.h3,
    fontSize: Typography.sizes.md,
    lineHeight: 22,
  },
  timeAgo: { ...Typography.presets.caption, marginTop: 2 },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
    marginRight: Spacing.sm,
  },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaChipText: { ...Typography.presets.caption },
  chipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Layout.radius.full,
  },
  chipBadgeText: {
    ...Typography.presets.label,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 16, // Smoother rounded shape
  },
  joinBtnText: { ...Typography.presets.bodySmall, fontWeight: "600" },

  /* Empty / Error */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: Spacing.xxl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.presets.h2,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  emptySubtitle: {
    ...Typography.presets.body,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 24, // Highly rounded
  },
  ctaBtnText: { ...Typography.presets.bodySmall, fontWeight: "600" },

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: { ...Typography.presets.bodySmall },

  /* FAB */
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
