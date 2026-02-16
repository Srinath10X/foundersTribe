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
} from "react-native";
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
  process.env.EXPO_PUBLIC_VOICE_API_URL || "http://localhost:3002";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
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

  const socketRef = useRef<Socket | null>(null);
  const roomRef = useRef<Room | null>(null);
  const chatListRef = useRef<FlatList>(null);

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
    roomRef.current?.disconnect();
    router.back();
  }, [roomId, router]);

  // Setup socket and LiveKit
  useEffect(() => {
    if (!roomId || !authToken) return;

    let socket: Socket | undefined;
    let livekitRoom: Room | undefined;

    const setup = async () => {
      try {
        setConnectionState(ConnectionState.Connecting);

        // 1. Connect Socket.IO
        socket = io(VOICE_API_URL, {
          transports: ["websocket"],
          auth: { token: authToken },
        });
        socketRef.current = socket;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Socket connection timeout")),
            10000,
          );
          socket!.on("connect", () => {
            clearTimeout(timeout);
            console.log("Room socket connected:", socket!.id);
            resolve();
          });
          socket!.on("connect_error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        // 2. Join room via socket → get livekitToken + data
        const result = await joinRoomViaSocket(socket!, roomId);
        setRoomTitle(result.room?.title || `Room`);
        setServerParticipants(result.participants || []);
        setChatMessages(result.messages || []);

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
              handleLeaveRoom();
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
        socket!.on("receive_message", (data: { message: ChatMessage }) => {
          setChatMessages((prev) => [...prev, data.message]);
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
          router.back();
        });

        socket!.on("room_ended", () => {
          Alert.alert("Room Ended", "The host has ended this room.");
          roomRef.current?.disconnect();
          router.back();
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

    socket.emit(
      "send_message",
      { roomId, content: messageInput.trim() },
      (response: any) => {
        if (!response.success) {
          console.error("Failed to send message:", response.error);
        }
      },
    );
    setMessageInput("");
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
      <View
        style={[styles.participantItem, { borderBottomColor: theme.border }]}
      >
        <View style={styles.participantLeft}>
          <View
            style={[
              styles.participantAvatar,
              { backgroundColor: theme.brand.primary + "20" },
              item.isSpeaking && { borderColor: theme.success, borderWidth: 2 },
            ]}
          >
            <Text
              style={[styles.avatarInitial, { color: theme.brand.primary }]}
            >
              {item.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.participantInfo}>
            <Text
              style={[styles.participantName, { color: theme.text.primary }]}
              numberOfLines={1}
            >
              {item.displayName} {isMe ? "(You)" : ""}
            </Text>
            <Text
              style={[styles.participantRole, { color: theme.text.tertiary }]}
            >
              {displayRole(item.role)}
            </Text>
          </View>
        </View>
        <View style={styles.participantRight}>
          {item.isMicEnabled && (
            <Ionicons
              name={item.isSpeaking ? "volume-high" : "mic"}
              size={16}
              color={item.isSpeaking ? theme.success : theme.text.tertiary}
            />
          )}
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
      </View>
    );
  };

  // Render chat message
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.user_id === currentUserId;
    return (
      <View style={[styles.messageItem, isMe && styles.messageItemMe]}>
        {!isMe && (
          <Text style={[styles.messageSender, { color: theme.brand.primary }]}>
            {item.user_name || item.user_id.slice(0, 8)}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isMe
              ? { backgroundColor: theme.brand.primary }
              : { backgroundColor: theme.surfaceElevated },
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
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  const isConnected = connectionState === ConnectionState.Connected;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLeaveRoom}
              style={styles.headerButton}
            >
              <Text style={[styles.leaveText, { color: theme.error }]}>
                Leave
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        {/* Participants Section */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={18} color={theme.brand.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Participants ({mergedParticipants.length})
            </Text>
          </View>
          <FlatList
            data={mergedParticipants}
            renderItem={renderParticipant}
            keyExtractor={(item) => item.user_id}
            scrollEnabled={false}
          />
        </View>

        {/* Voice Controls */}
        <View
          style={[
            styles.controlsRow,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.micButton,
              {
                backgroundColor: !canSpeak
                  ? theme.text.muted
                  : isMicEnabled
                    ? theme.error
                    : theme.success,
              },
            ]}
            onPress={handleToggleMic}
            disabled={!isConnected || !canSpeak}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMicEnabled ? "mic" : "mic-off"}
              size={24}
              color={theme.text.inverse}
            />
          </TouchableOpacity>
          <View style={styles.controlInfo}>
            <Text style={[styles.controlLabel, { color: theme.text.primary }]}>
              {!isConnected
                ? "Connecting..."
                : isMicEnabled
                  ? "Mic On"
                  : canSpeak
                    ? "Mic Off"
                    : "Listening"}
            </Text>
            <Text style={[styles.controlSub, { color: theme.text.tertiary }]}>
              Role: {displayRole(myRole)}
            </Text>
          </View>
        </View>

        {/* Chat Section */}
        <View
          style={[
            styles.chatSection,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons
              name="chatbubbles"
              size={18}
              color={theme.brand.primary}
            />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Chat
            </Text>
          </View>
          <FlatList
            ref={chatListRef}
            data={chatMessages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => item.id || index.toString()}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
            onContentSizeChange={() =>
              chatListRef.current?.scrollToEnd({ animated: true })
            }
          />
          <View style={[styles.chatInputRow, { borderTopColor: theme.border }]}>
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
                (!isConnected || !messageInput.trim()) && { opacity: 0.5 },
              ]}
              onPress={handleSendMessage}
              disabled={!isConnected || !messageInput.trim()}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={18} color={theme.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerButton: {
    paddingHorizontal: Spacing.xs,
  },
  leaveText: {
    ...Typography.presets.body,
    fontWeight: "600",
  },
  section: {
    borderRadius: Layout.radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    maxHeight: 200,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.presets.h3,
    fontSize: Typography.sizes.md,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  participantLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  avatarInitial: {
    ...Typography.presets.body,
    fontWeight: "600",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    ...Typography.presets.bodySmall,
    fontWeight: "600",
  },
  participantRole: {
    ...Typography.presets.caption,
  },
  participantRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  promoteButton: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.radius.sm,
  },
  promoteText: {
    ...Typography.presets.caption,
    fontWeight: "600",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Layout.radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  controlInfo: {
    flex: 1,
  },
  controlLabel: {
    ...Typography.presets.body,
    fontWeight: "600",
  },
  controlSub: {
    ...Typography.presets.caption,
  },
  chatSection: {
    flex: 1,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  chatList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  chatListContent: {
    paddingBottom: Spacing.xs,
  },
  messageItem: {
    marginBottom: Spacing.xs,
    alignItems: "flex-start",
  },
  messageItemMe: {
    alignItems: "flex-end",
  },
  messageSender: {
    ...Typography.presets.caption,
    fontWeight: "600",
    marginBottom: 2,
    marginLeft: Spacing.xxs,
  },
  messageBubble: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.radius.md,
    maxWidth: "80%",
  },
  messageText: {
    ...Typography.presets.bodySmall,
  },
  messageTime: {
    ...Typography.presets.caption,
    fontSize: 10,
    marginTop: 2,
    marginHorizontal: Spacing.xxs,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
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
