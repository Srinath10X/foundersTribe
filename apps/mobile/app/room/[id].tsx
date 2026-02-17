import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Room,
  RoomEvent,
  Participant,
  RemoteParticipant,
  ConnectionState,
} from "livekit-client";
import { io, Socket } from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";

import {
  joinRoomViaSocket,
  connectToLiveKitRoom,
  toggleMic,
  getParticipantInfo,
  ParticipantInfo,
} from "../../lib/livekit";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Typography, Spacing, Layout } from "../../constants/DesignSystem";

const VOICE_API_URL =
  process.env.EXPO_PUBLIC_VOICE_API_URL || "http://192.168.1.4:3002";

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  user_name?: string;
  created_at: string;
}

function normalizeMessage(raw: any): ChatMessage {
  return {
    id: raw.id || raw._id || `${Date.now()}-${Math.random()}`,
    content: raw.content || raw.text || "",
    sender_id: raw.sender_id || raw.user_id || "",
    user_name: raw.user_name || raw.username || undefined,
    created_at: raw.created_at || raw.createdAt || new Date().toISOString(),
  };
}

interface ServerParticipant {
  id: string;
  user_id: string;
  role: "host" | "co-host" | "speaker" | "listener";
  is_connected: boolean;
  user_name?: string;
}

export default function RoomScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { theme, isDark } = useTheme();

  const currentUserId = session?.user?.id || "";
  const authToken = session?.access_token;

  const insets = useSafeAreaInsets();

  const [room, setRoom] = useState<Room | null>(null);
  const [serverParticipants, setServerParticipants] = useState<
    ServerParticipant[]
  >([]);
  const [livekitParticipants, setLivekitParticipants] = useState<
    ParticipantInfo[]
  >([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected,
  );
  const [myRole, setMyRole] = useState<
    "host" | "co-host" | "speaker" | "listener"
  >("listener");
  const [roomTitle, setRoomTitle] = useState("Room");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const roomRef = useRef<Room | null>(null);
  const chatListRef = useRef<FlatList>(null);
  const handRaiseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayRole = (role: string) => {
    if (role === "listener") return "audience";
    return role;
  };

  const canSpeak =
    myRole === "host" || myRole === "co-host" || myRole === "speaker";

  // Merge server participant data with LiveKit speaking data
  const mergedParticipants = serverParticipants.map((sp) => {
    const lkp = livekitParticipants.find((p) => p.identity === sp.user_id);
    return {
      ...sp,
      isSpeaking: lkp?.isSpeaking || false,
      isMicEnabled: lkp?.isMicEnabled || false,
      displayName: sp.user_name || sp.user_id.slice(0, 8),
    };
  });

  const handleLeaveRoom = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.connected && roomId) {
      socket.emit("leave_room", { roomId }, () => {});
    }
    socket?.removeAllListeners();
    socket?.disconnect();
    socketRef.current = null;
    roomRef.current?.disconnect();
    roomRef.current = null;
    router.replace("/(tabs)/community");
  }, [roomId, router]);

  // Setup socket and LiveKit
  useEffect(() => {
    if (!roomId || !authToken) return;

    let socket: Socket | undefined;
    let livekitRoom: Room | undefined;

    const setup = async () => {
      try {
        setConnectionState(ConnectionState.Connecting);
        console.log("[Room] Connecting socket to:", VOICE_API_URL);

        // 1. Connect Socket.IO
        socket = io(VOICE_API_URL, {
          transports: ["websocket", "polling"],
          auth: { token: authToken },
        });
        socketRef.current = socket;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Socket connection timeout — check VOICE_API_URL: " + VOICE_API_URL)),
            15000,
          );
          socket!.on("connect", () => {
            clearTimeout(timeout);
            console.log("[Room] Socket connected:", socket!.id);
            resolve();
          });
          socket!.on("connect_error", (err) => {
            clearTimeout(timeout);
            console.error("[Room] Socket connect_error:", err.message);
            reject(err);
          });
        });

        // 2. Join room via socket → get livekitToken + data
        const result = await joinRoomViaSocket(socket!, roomId);
        setRoomTitle(result.room?.title || `Room`);
        setServerParticipants(result.participants || []);
        setChatMessages((result.messages || []).map(normalizeMessage));

        // Set my role
        const myParticipant = result.participants?.find(
          (p: ServerParticipant) => p.user_id === currentUserId,
        );
        if (myParticipant) {
          setMyRole(myParticipant.role);
        }

        // 3. Connect LiveKit
        livekitRoom = await connectToLiveKitRoom(result.livekitToken);
        setRoom(livekitRoom);
        roomRef.current = livekitRoom;
        setConnectionState(ConnectionState.Connected);

        // LiveKit event listeners
        const updateLKParticipants = (lkRoom: Room) => {
          const all = [
            lkRoom.localParticipant,
            ...Array.from(lkRoom.remoteParticipants.values()),
          ];
          setLivekitParticipants(all.map((p) => getParticipantInfo(p)));
        };

        livekitRoom
          .on(RoomEvent.ParticipantConnected, () =>
            updateLKParticipants(livekitRoom!),
          )
          .on(RoomEvent.ParticipantDisconnected, () =>
            updateLKParticipants(livekitRoom!),
          )
          .on(RoomEvent.ActiveSpeakersChanged, () =>
            updateLKParticipants(livekitRoom!),
          )
          .on(RoomEvent.TrackPublished, () =>
            updateLKParticipants(livekitRoom!),
          )
          .on(RoomEvent.TrackUnpublished, () =>
            updateLKParticipants(livekitRoom!),
          )
          .on(RoomEvent.LocalTrackPublished, () =>
            updateLKParticipants(livekitRoom!),
          )
          .on(RoomEvent.LocalTrackUnpublished, () =>
            updateLKParticipants(livekitRoom!),
          )
          .on(RoomEvent.ConnectionStateChanged, (state) => {
            setConnectionState(state);
            if (state === ConnectionState.Disconnected) {
              Alert.alert(
                "Disconnected",
                "You have been disconnected from the room.",
              );
              socketRef.current?.removeAllListeners();
              socketRef.current?.disconnect();
              socketRef.current = null;
              roomRef.current = null;
              router.replace("/(tabs)/community");
            }
          });

        updateLKParticipants(livekitRoom);

        // Enable mic if host/speaker
        if (
          myParticipant &&
          ["host", "co-host", "speaker"].includes(myParticipant.role)
        ) {
          await toggleMic(livekitRoom.localParticipant, true);
          setIsMicEnabled(true);
        }

        // Socket.IO room event listeners
        socket!.on("receive_message", (data: { message: any }) => {
          const msg = normalizeMessage(data.message);
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            // Replace optimistic message from same sender with same content
            const withoutOptimistic = prev.filter(
              (m) =>
                !(
                  m.id.startsWith("local-") &&
                  m.sender_id === msg.sender_id &&
                  m.content === msg.content
                ),
            );
            return [...withoutOptimistic, msg];
          });
        });

        socket!.on(
          "participant_joined",
          (data: { participant: ServerParticipant }) => {
            setServerParticipants((prev) => {
              const exists = prev.some(
                (p) => p.user_id === data.participant.user_id,
              );
              if (exists) return prev;
              return [...prev, data.participant];
            });
          },
        );

        socket!.on("participant_left", (data: { userId: string }) => {
          setServerParticipants((prev) =>
            prev.filter((p) => p.user_id !== data.userId),
          );
        });

        socket!.on(
          "participant_updated",
          (data: { participant: ServerParticipant }) => {
            setServerParticipants((prev) =>
              prev.map((p) =>
                p.user_id === data.participant.user_id ? data.participant : p,
              ),
            );
            // Update my own role if changed
            if (data.participant.user_id === currentUserId) {
              setMyRole(data.participant.role);
            }
          },
        );

        socket!.on(
          "role_changed",
          (data: { participant: ServerParticipant; livekitToken: string }) => {
            setMyRole(data.participant.role);
            // Reconnect LiveKit with new token for updated permissions
            if (livekitRoom) {
              livekitRoom.disconnect();
              connectToLiveKitRoom(data.livekitToken).then((newRoom) => {
                setRoom(newRoom);
                roomRef.current = newRoom;
                const canPublish = ["host", "co-host", "speaker"].includes(
                  data.participant.role,
                );
                if (canPublish) {
                  toggleMic(newRoom.localParticipant, true);
                  setIsMicEnabled(true);
                }
              });
            }
          },
        );

        socket!.on(
          "mic_granted",
          (data: { participant: ServerParticipant; livekitToken: string }) => {
            setMyRole(data.participant.role);
            if (livekitRoom) {
              livekitRoom.disconnect();
              connectToLiveKitRoom(data.livekitToken).then((newRoom) => {
                setRoom(newRoom);
                roomRef.current = newRoom;
                toggleMic(newRoom.localParticipant, true);
                setIsMicEnabled(true);
              });
            }
          },
        );

        socket!.on("removed_from_room", () => {
          Alert.alert("Removed", "You have been removed from the room.");
          roomRef.current?.disconnect();
          roomRef.current = null;
          socketRef.current?.removeAllListeners();
          socketRef.current?.disconnect();
          socketRef.current = null;
          router.replace("/(tabs)/community");
        });

        socket!.on("room_ended", () => {
          Alert.alert("Room Ended", "The host has ended this room.");
          roomRef.current?.disconnect();
          roomRef.current = null;
          socketRef.current?.removeAllListeners();
          socketRef.current?.disconnect();
          socketRef.current = null;
          router.replace("/(tabs)/community");
        });
      } catch (error: any) {
        console.error("Failed to setup room:", error);
        Alert.alert("Error", `Failed to join room: ${error.message}`);
        setConnectionState(ConnectionState.Disconnected);
        socket?.disconnect();
      }
    };

    setup();

    return () => {
      roomRef.current?.disconnect();
      socketRef.current?.disconnect();
      socketRef.current = null;
      roomRef.current = null;
    };
  }, [roomId, authToken, currentUserId]);

  // Toggle mic
  const handleToggleMic = async () => {
    if (!room?.localParticipant) return;
    if (!canSpeak) {
      Alert.alert(
        "Permission Denied",
        "Only speakers and hosts can use the microphone.",
      );
      return;
    }
    const newState = !isMicEnabled;
    await toggleMic(room.localParticipant, newState);
    setIsMicEnabled(newState);
  };

  // Send chat message
  const handleSendMessage = () => {
    const socket = socketRef.current;
    if (!socket?.connected || !messageInput.trim()) return;

    const content = messageInput.trim();

    // Optimistic UI update
    const optimisticMsg = normalizeMessage({
      id: `local-${Date.now()}`,
      content,
      sender_id: currentUserId,
      user_name: session?.user?.user_metadata?.name,
      created_at: new Date().toISOString(),
    });
    setChatMessages((prev) => [...prev, optimisticMsg]);
    setMessageInput("");

    socket.emit("send_message", { roomId, content }, (response: any) => {
      if (!response.success) {
        console.error("Failed to send message:", response.error);
      }
    });
  };

  // Promote audience → speaker
  const handlePromote = (targetUserId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit(
      "promote_user",
      { targetId: targetUserId, roomId, role: "speaker" },
      (response: any) => {
        if (!response.success) {
          Alert.alert("Error", response.error || "Failed to promote user");
        }
      },
    );
  };

  // Render participant item
  const renderParticipant = ({
    item,
  }: {
    item: (typeof mergedParticipants)[0];
  }) => {
    const isMe = item.user_id === currentUserId;
    const isAudience = item.role === "listener";
    const showPromote = myRole === "host" && isAudience && !isMe;

    return (
      <View style={styles.participantCard}>
        <View
          style={[
            styles.participantAvatarLarge,
            { backgroundColor: theme.brand.primary + "18" },
            item.isSpeaking && {
              borderColor: theme.success,
              borderWidth: 2.5,
              shadowColor: theme.success,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 6,
            },
          ]}
        >
          <Text
            style={[styles.avatarInitialLarge, { color: theme.brand.primary }]}
          >
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
          {item.isMicEnabled && (
            <View
              style={[
                styles.avatarMicBadge,
                {
                  backgroundColor: item.isSpeaking
                    ? theme.success
                    : theme.text.muted,
                },
              ]}
            >
              <Ionicons name="mic" size={10} color="#fff" />
            </View>
          )}
        </View>
        <Text
          style={[styles.participantNameGrid, { color: theme.text.primary }]}
          numberOfLines={1}
        >
          {item.displayName}
          {isMe ? " (You)" : ""}
        </Text>
        <Text
          style={[styles.participantRoleGrid, { color: theme.text.tertiary }]}
        >
          {displayRole(item.role)}
        </Text>
        {showPromote && (
          <TouchableOpacity
            style={[
              styles.promoteButton,
              { backgroundColor: theme.brand.primary },
            ]}
            onPress={() => handlePromote(item.user_id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.promoteText, { color: theme.text.inverse }]}>
              Promote
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render chat message
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_id === currentUserId;
    return (
      <View style={[styles.messageItem, isMe && styles.messageItemMe]}>
        {!isMe && (
          <Text style={[styles.messageSender, { color: theme.brand.primary }]}>
            {item.user_name ||
              (item.sender_id ? item.sender_id.slice(0, 8) : "User")}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isMe
              ? [
                  styles.messageBubbleMe,
                  { backgroundColor: theme.brand.primary },
                ]
              : [
                  styles.messageBubbleOther,
                  { backgroundColor: theme.surfaceElevated },
                ],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isMe ? theme.text.inverse : theme.text.primary },
            ]}
          >
            {item.content}
          </Text>
        </View>
        <Text style={[styles.messageTime, { color: theme.text.muted }]}>
          {item.created_at
            ? new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </Text>
      </View>
    );
  };

  // Render empty chat state
  const renderEmptyChat = () => (
    <View style={styles.emptyChatContainer}>
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={48}
        color={theme.text.muted}
      />
      <Text style={[styles.emptyChatTitle, { color: theme.text.tertiary }]}>
        No messages yet
      </Text>
      <Text style={[styles.emptyChatSub, { color: theme.text.muted }]}>
        Be the first to send a message!
      </Text>
    </View>
  );

  const isConnected = connectionState === ConnectionState.Connected;

  const unreadCount = isChatOpen ? 0 : chatMessages.length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["bottom", "top"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen
        options={{
          headerShown: true,
          title: roomTitle,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text.primary,
          headerTitleStyle: {
            ...Typography.presets.h3,
            color: theme.text.primary,
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleLeaveRoom}
              style={styles.headerButton}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.text.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Connection Status Badge */}
        {!isConnected && (
          <View
            style={[
              styles.connectionBadge,
              { backgroundColor: theme.warning + "20" },
            ]}
          >
            <Ionicons name="wifi" size={14} color={theme.warning} />
            <Text
              style={[styles.connectionBadgeText, { color: theme.warning }]}
            >
              Connecting to room...
            </Text>
          </View>
        )}

        {/* Participants Grid */}
        <View
          style={[
            styles.participantsSection,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              ...Layout.shadows.sm,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIconContainer,
                { backgroundColor: theme.brand.primary + "18" },
              ]}
            >
              <Ionicons name="people" size={16} color={theme.brand.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Participants
            </Text>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: theme.brand.primary + "18" },
              ]}
            >
              <Text
                style={[styles.countBadgeText, { color: theme.brand.primary }]}
              >
                {mergedParticipants.length}
              </Text>
            </View>
          </View>
          <FlatList
            data={mergedParticipants}
            renderItem={renderParticipant}
            keyExtractor={(item) => item.user_id}
            numColumns={4}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            columnWrapperStyle={styles.participantRow}
            contentContainerStyle={styles.participantGridContent}
          />
        </View>

        {/* Voice Status Card */}
        <View
          style={[
            styles.voiceStatusCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              ...Layout.shadows.md,
            },
          ]}
        >
          <View
            style={[
              styles.voiceMicCircle,
              {
                backgroundColor: !canSpeak
                  ? theme.text.muted + "30"
                  : isMicEnabled
                    ? theme.error + "20"
                    : theme.success + "20",
              },
            ]}
          >
            <Ionicons
              name={isMicEnabled ? "mic" : "mic-off"}
              size={36}
              color={
                !canSpeak
                  ? theme.text.muted
                  : isMicEnabled
                    ? theme.error
                    : theme.success
              }
            />
          </View>
          <Text
            style={[styles.voiceStatusTitle, { color: theme.text.primary }]}
          >
            {!isConnected
              ? "Connecting..."
              : isMicEnabled
                ? "You're Live"
                : canSpeak
                  ? "Mic Off"
                  : "Listening"}
          </Text>
          <View
            style={[
              styles.voiceRolePill,
              { backgroundColor: theme.brand.primary + "18" },
            ]}
          >
            <Text
              style={[styles.voiceRoleText, { color: theme.brand.primary }]}
            >
              {displayRole(myRole)}
            </Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Hand Raised Toast */}
        {isHandRaised && (
          <View
            style={[
              styles.handRaisedToast,
              {
                backgroundColor: theme.warning + "20",
                borderColor: theme.warning + "40",
              },
            ]}
          >
            <Ionicons name="hand-left" size={16} color={theme.warning} />
            <Text
              style={[styles.handRaisedToastText, { color: theme.warning }]}
            >
              Hand Raised — the host has been notified
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Controls Bar */}
      {/* Bottom Controls Bar */}
      <SafeAreaView style={styles.bottomControlsSafeArea} edges={["bottom"]}>
        <View
          style={[
            styles.bottomControlsBar,
            {
              ...Layout.shadows.md,
            },
          ]}
        >
          {/* Mic Toggle */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleToggleMic}
            disabled={!isConnected || !canSpeak}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.controlButtonIcon,
                {
                  backgroundColor: isMicEnabled
                    ? "#FFFFFF"
                    : theme.text.muted + "20",
                },
              ]}
            >
              <Ionicons
                name={isMicEnabled ? "mic" : "mic-off"}
                size={22}
                color={isMicEnabled ? "#1A1A1B" : theme.text.secondary}
              />
            </View>
            <Text
              style={[
                styles.controlButtonLabel,
                { color: theme.text.secondary },
              ]}
            >
              {isMicEnabled ? "Mute" : "Unmute"}
            </Text>
          </TouchableOpacity>

          {/* Raise Hand */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              if (handRaiseTimerRef.current) {
                clearTimeout(handRaiseTimerRef.current);
                handRaiseTimerRef.current = null;
              }
              const newState = !isHandRaised;
              setIsHandRaised(newState);
              if (newState) {
                handRaiseTimerRef.current = setTimeout(() => {
                  setIsHandRaised(false);
                  handRaiseTimerRef.current = null;
                }, 5000);
              }
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.controlButtonIcon,
                {
                  backgroundColor: isHandRaised
                    ? theme.warning + "25"
                    : theme.text.muted + "20",
                },
              ]}
            >
              <Ionicons
                name={isHandRaised ? "hand-left" : "hand-left-outline"}
                size={22}
                color={isHandRaised ? theme.warning : theme.text.secondary}
              />
            </View>
            <Text
              style={[
                styles.controlButtonLabel,
                { color: isHandRaised ? theme.warning : theme.text.secondary },
              ]}
            >
              {isHandRaised ? "Lower" : "Raise"}
            </Text>
          </TouchableOpacity>

          {/* Chat */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setIsChatOpen(true)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.controlButtonIcon,
                { backgroundColor: theme.text.muted + "20" },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={22}
                color={theme.text.secondary}
              />
              {chatMessages.length > 0 && (
                <View
                  style={[styles.chatBadge, { backgroundColor: theme.error }]}
                >
                  <Text style={styles.chatBadgeText}>
                    {chatMessages.length > 99 ? "99+" : chatMessages.length}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.controlButtonLabel,
                { color: theme.text.secondary },
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>

          {/* Leave Room */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleLeaveRoom}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.controlButtonIcon,
                styles.leaveButtonIcon,
                { backgroundColor: theme.error },
              ]}
            >
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </View>
            <Text style={[styles.controlButtonLabel, { color: theme.error }]}>
              Leave
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Chat Modal */}
      <Modal
        visible={isChatOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsChatOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.chatModalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setIsChatOpen(false)}
          />
          <View
            style={[
              styles.chatModalContainer,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Modal Header */}
            <View
              style={[
                styles.chatModalHeader,
                { borderBottomColor: theme.border },
              ]}
            >
              <View style={styles.chatModalHeaderLeft}>
                <Ionicons
                  name="chatbubbles"
                  size={20}
                  color={theme.brand.primary}
                />
                <Text
                  style={[styles.chatModalTitle, { color: theme.text.primary }]}
                >
                  Chat
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsChatOpen(false)}
                style={[
                  styles.chatModalCloseBtn,
                  { backgroundColor: theme.surfaceElevated },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={chatListRef}
              data={chatMessages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => item.id || index.toString()}
              style={styles.chatList}
              contentContainerStyle={[
                styles.chatListContent,
                chatMessages.length === 0 && styles.chatListEmpty,
              ]}
              onContentSizeChange={() =>
                chatListRef.current?.scrollToEnd({ animated: true })
              }
              ListEmptyComponent={renderEmptyChat}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            />

            {/* Input Row */}
            <View
              style={[
                styles.chatInputRow,
                {
                  borderTopColor: theme.border,
                  backgroundColor: theme.background,
                  paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.sm,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.chatInput,
                  {
                    backgroundColor: theme.surfaceElevated,
                    color: theme.text.primary,
                    borderColor: theme.border,
                  },
                ]}
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="Type a message..."
                placeholderTextColor={theme.text.muted}
                editable={isConnected}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: theme.brand.primary },
                  (!isConnected || !messageInput.trim()) && { opacity: 0.4 },
                ]}
                onPress={handleSendMessage}
                disabled={!isConnected || !messageInput.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color={theme.text.inverse} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: Spacing.xs,
  },
  // Main content
  mainContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  // Connection status
  connectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.radius.md,
  },
  connectionBadgeText: {
    ...Typography.presets.caption,
    fontWeight: "600",
  },
  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    ...Typography.presets.body,
    fontWeight: "600",
    flex: 1,
  },
  countBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: Layout.radius.sm,
  },
  countBadgeText: {
    ...Typography.presets.caption,
    fontWeight: "700",
  },
  // Participants Grid
  participantsSection: {
    borderRadius: Layout.radius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    maxHeight: 280,
  },
  participantRow: {
    justifyContent: "flex-start",
    gap: Spacing.sm,
  },
  participantGridContent: {
    gap: Spacing.sm,
  },
  participantCard: {
    alignItems: "center",
    width: 72,
    gap: 4,
  },
  participantAvatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarInitialLarge: {
    fontSize: 20,
    fontWeight: "700",
  },
  avatarMicBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#151517",
  },
  participantNameGrid: {
    ...Typography.presets.caption,
    fontWeight: "600",
    textAlign: "center",
  },
  participantRoleGrid: {
    fontSize: 10,
    textAlign: "center",
    textTransform: "capitalize",
  },
  promoteButton: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.xs,
    borderRadius: Layout.radius.sm,
    marginTop: 2,
  },
  promoteText: {
    fontSize: 10,
    fontWeight: "600",
  },
  // Voice Status Card
  voiceStatusCard: {
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  voiceMicCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceStatusTitle: {
    ...Typography.presets.h2,
    fontWeight: "700",
  },
  voiceRolePill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.radius.full,
  },
  voiceRoleText: {
    ...Typography.presets.caption,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  // Hand Raised Toast
  handRaisedToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
  },
  handRaisedToastText: {
    ...Typography.presets.bodySmall,
    fontWeight: "600",
  },
  // Chat badge (on control button icon)
  chatBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  chatBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  // Bottom Controls SafeArea Wrapper
  bottomControlsSafeArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  // Bottom Controls Bar
  bottomControlsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    borderRadius: Layout.radius.xxl,
    backgroundColor: "rgba(21, 21, 23, 0.85)",
  },
  controlButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  controlButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  leaveButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 16, // Squircle
  },
  controlButtonLabel: {
    ...Typography.presets.caption,
    fontSize: 11,
    fontWeight: "600",
  },
  // Floating Chat Button
  floatingChatButton: {
    position: "absolute",
    bottom: 80,
    right: Spacing.md,
    ...Layout.shadows.lg,
  },
  floatingChatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  // Chat Modal
  chatModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  chatModalContainer: {
    height: "75%",
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
  },
  chatModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatModalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  chatModalTitle: {
    ...Typography.presets.h3,
  },
  chatModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  // Chat list + messages
  chatList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  chatListContent: {
    paddingVertical: Spacing.xs,
  },
  chatListEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  emptyChatContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
    gap: Spacing.xs,
  },
  emptyChatTitle: {
    ...Typography.presets.body,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  emptyChatSub: {
    ...Typography.presets.caption,
  },
  messageItem: {
    marginBottom: Spacing.sm,
    alignItems: "flex-start",
  },
  messageItemMe: {
    alignItems: "flex-end",
  },
  messageSender: {
    ...Typography.presets.caption,
    fontWeight: "600",
    marginBottom: 3,
    marginLeft: Spacing.xxs,
  },
  messageBubble: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    maxWidth: "80%",
  },
  messageBubbleMe: {
    borderRadius: Layout.radius.md,
    borderBottomRightRadius: Layout.radius.xs,
  },
  messageBubbleOther: {
    borderRadius: Layout.radius.md,
    borderBottomLeftRadius: Layout.radius.xs,
  },
  messageText: {
    ...Typography.presets.bodySmall,
  },
  messageTime: {
    ...Typography.presets.caption,
    fontSize: 10,
    marginTop: 3,
    marginHorizontal: Spacing.xxs,
  },
  // Chat Input
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: Layout.radius.xl,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    ...Typography.presets.bodySmall,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
