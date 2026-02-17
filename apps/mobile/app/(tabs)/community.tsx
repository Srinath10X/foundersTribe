import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { io, Socket } from "socket.io-client";

import CreateRoomModal from "../../components/CreateRoomModal";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Typography, Spacing, Layout } from "../../constants/DesignSystem";
import { createRoomViaSocket } from "../../lib/livekit";

const VOICE_API_URL =
  process.env.EXPO_PUBLIC_VOICE_API_URL || "http://192.168.0.28:3002";

interface RoomItem {
  id: string;
  title: string;
  type: "public" | "private";
  host_id: string;
  participant_count: number;
  is_active: boolean;
}

export default function CommunityScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const currentUserId = session?.user?.id;
  const authToken = session?.access_token;

  // Connect socket and fetch rooms
  useEffect(() => {
    if (!authToken) return;

    const socket = io(VOICE_API_URL, {
      transports: ["websocket"],
      auth: { token: authToken },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Community socket connected:", socket.id);
      fetchRooms();
    });

    socket.on("connect_error", (err) => {
      console.error("Community socket error:", err.message);
      setLoading(false);
    });

    // Real-time updates
    socket.on(
      "room_created",
      (data: { room: RoomItem; participant_count: number }) => {
        setRooms((prev) => {
          const exists = prev.some((r) => r.id === data.room.id);
          if (exists) return prev;
          return [
            ...prev,
            { ...data.room, participant_count: data.participant_count },
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

  const fetchRooms = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${VOICE_API_URL}/api/get_all_available_rooms`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  const handleCreateRoom = async (roomName: string, isPublic: boolean) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    try {
      const result = await createRoomViaSocket(
        socket,
        roomName,
        isPublic ? "public" : "private",
      );
      setCreateModalVisible(false);
      router.push(`/room/${result.room.id}`);
    } catch (err: any) {
      console.error("Failed to create room:", err.message);
    }
  };

  const publicRooms = rooms.filter((r) => r.type === "public");
  const privateRooms = rooms.filter(
    (r) => r.type === "private" || r.host_id === currentUserId,
  );
  const displayedRooms = activeTab === "public" ? publicRooms : privateRooms;

  // Room card
  const RoomCard = ({ room }: { room: RoomItem }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.cardLeft}>
        <View
          style={[
            styles.roomIcon,
            { backgroundColor: theme.brand.primary + "15" },
          ]}
        >
          <Ionicons
            name={
              room.type === "public" ? "radio-outline" : "lock-closed-outline"
            }
            size={20}
            color={theme.brand.primary}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text
            style={[styles.roomName, { color: theme.text.primary }]}
            numberOfLines={1}
          >
            {room.title}
          </Text>
          <View style={styles.participantRow}>
            <Ionicons
              name="people-outline"
              size={14}
              color={theme.text.tertiary}
            />
            <Text
              style={[styles.participantCount, { color: theme.text.tertiary }]}
            >
              {room.participant_count}{" "}
              {room.participant_count === 1 ? "person" : "people"}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.joinButton, { backgroundColor: theme.brand.primary }]}
        onPress={() => handleJoinRoom(room.id)}
        activeOpacity={0.8}
      >
        <Text style={[styles.joinButtonText, { color: theme.text.inverse }]}>
          Join
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Empty state
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === "public" ? "radio-outline" : "lock-closed-outline"}
        size={48}
        color={theme.text.muted}
      />
      <Text style={[styles.emptyTitle, { color: theme.text.secondary }]}>
        {activeTab === "public"
          ? "No public rooms yet"
          : "No private rooms yet"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
        {activeTab === "public"
          ? "Create the first room to start a conversation"
          : "Create a private room or get invited to one"}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Community
        </Text>
      </View>

      {/* Segmented Control */}
      <View
        style={[styles.segmentedControl, { backgroundColor: theme.surface }]}
      >
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "public" && { backgroundColor: theme.brand.primary },
          ]}
          onPress={() => setActiveTab("public")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.text.secondary },
              activeTab === "public" && {
                color: theme.text.inverse,
                fontWeight: "600",
              },
            ]}
          >
            Public
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "private" && { backgroundColor: theme.brand.primary },
          ]}
          onPress={() => setActiveTab("private")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.text.secondary },
              activeTab === "private" && {
                color: theme.text.inverse,
                fontWeight: "600",
              },
            ]}
          >
            Private
          </Text>
        </TouchableOpacity>
      </View>

      {/* Room List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={displayedRooms}
          renderItem={({ item }) => <RoomCard room={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
        />
      )}

      {/* Create Room Modal */}
      <CreateRoomModal
        isVisible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreateRoom}
      />

      {/* Floating Create Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: theme.brand.primary },
          Layout.shadows.lg,
        ]}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={theme.text.inverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    marginVertical: Spacing.xs,
    marginLeft: Spacing.xs,
    ...Typography.presets.h1,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: Layout.radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.xxs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Layout.radius.sm,
  },
  tabText: {
    ...Typography.presets.body,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: Layout.radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.sm,
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: Layout.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  roomName: {
    ...Typography.presets.h3,
    fontSize: Typography.sizes.md,
    marginBottom: 2,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  participantCount: {
    ...Typography.presets.caption,
  },
  joinButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.radius.sm,
  },
  joinButtonText: {
    ...Typography.presets.bodySmall,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    ...Typography.presets.h3,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  emptySubtitle: {
    ...Typography.presets.bodySmall,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
