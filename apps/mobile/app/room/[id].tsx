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
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";

import {
  VOICE_API_URL,
  joinRoomViaSocket,
  connectToLiveKitRoom,
  toggleMic,
  getParticipantInfo,
  ParticipantInfo,
} from "../../lib/livekit";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../lib/supabase";
import { Typography, Spacing, Layout } from "../../constants/DesignSystem";

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
  const [selectedParticipant, setSelectedParticipant] = useState<
    (ServerParticipant & { isSpeaking: boolean; isMicEnabled: boolean; displayName: string }) | null
  >(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const roomRef = useRef<Room | null>(null);
  const chatListRef = useRef<FlatList>(null);
  const handRaiseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag to prevent the LiveKit ConnectionStateChanged handler from tearing
  // down the socket when we intentionally disconnect LiveKit for a token swap
  const isReconnectingLiveKitRef = useRef(false);
  // Track the roomId for reconnection logic
  const activeRoomIdRef = useRef<string | null>(null);
  // Stable router ref so event handlers don't need router in their dep arrays
  const routerRef = useRef(router);
  // Guard to prevent concurrent mic toggles (causes duplicate track listener warning)
  const isMicTogglingRef = useRef(false);
  useEffect(() => { routerRef.current = router; }, [router]);

  const displayRole = (role: string) => {
    if (role === "listener") return "audience";
    return role;
  };

  const canSpeak =
    myRole === "host" || myRole === "co-host" || myRole === "speaker";

  // Merge server participant data with LiveKit speaking data
  // Filter out disconnected participants to keep the list clean
  const mergedParticipants = serverParticipants
    .filter((sp) => sp.is_connected !== false)
    .map((sp) => {
      const lkp = livekitParticipants.find((p) => p.identity === sp.user_id);
      return {
        ...sp,
        isSpeaking: lkp?.isSpeaking || false,
        isMicEnabled: lkp?.isMicEnabled || false,
        displayName: sp.user_name || sp.user_id.slice(0, 8),
      };
    });

  const handleLeaveRoom = useCallback(() => {
    activeRoomIdRef.current = null;
    const socket = socketRef.current;
    if (socket?.connected && roomId) {
      socket.emit("leave_room", { roomId }, () => { });
    }
    socket?.removeAllListeners();
    socket?.disconnect();
    socketRef.current = null;
    isReconnectingLiveKitRef.current = true; // prevent ConnectionStateChanged from double-navigating
    roomRef.current?.disconnect();
    roomRef.current = null;
    routerRef.current.replace("/(role-pager)/(founder-tabs)/community");
    // roomId is the only real dep — routerRef is stable
  }, [roomId]);

  // Helper: swap LiveKit connection with a new token without tearing down Socket.IO
  const reconnectLiveKit = useCallback(
    async (newToken: string, newRole: string, livekitUrl?: string) => {
      isReconnectingLiveKitRef.current = true;
      try {
        roomRef.current?.disconnect();
        // Ensure speaker preferred before reconnecting LiveKit
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: true,
          });
          console.log("[Room] Audio mode set before LiveKit reconnect (speaker preferred)");
        } catch (err) {
          console.warn("[Room] Failed to set audio mode before reconnect:", err);
        }
        const newRoom = await connectToLiveKitRoom(newToken, livekitUrl);
        setRoom(newRoom);
        roomRef.current = newRoom;
        setConnectionState(ConnectionState.Connected);

        // Re-attach LiveKit event listeners on the new room
        attachLiveKitListeners(newRoom);

        const canPublish = ["host", "co-host", "speaker"].includes(newRole);
        if (canPublish) {
          await toggleMic(newRoom.localParticipant, true);
          setIsMicEnabled(true);
        } else {
          setIsMicEnabled(false);
        }
      } catch (err) {
        console.error("[Room] Failed to reconnect LiveKit:", err);
      } finally {
        isReconnectingLiveKitRef.current = false;
      }
    },
    [],
  );

  // LiveKit event listener attachment — extracted so we can re-attach after token swap.
  // IMPORTANT: removeAllListeners() is called first to prevent duplicate handlers
  // when this is called again after a token swap (reconnectLiveKit).
  const attachLiveKitListeners = useCallback((lkRoom: Room) => {
    // Remove any previously attached listeners on this room instance first
    lkRoom.removeAllListeners();

    const updateLKParticipants = () => {
      const all = [
        lkRoom.localParticipant,
        ...Array.from(lkRoom.remoteParticipants.values()),
      ];
      setLivekitParticipants(all.map((p) => getParticipantInfo(p)));
    };

    const handleConnectionStateChanged = (state: ConnectionState) => {
      // Skip if we're intentionally swapping LiveKit tokens
      if (isReconnectingLiveKitRef.current) return;

      setConnectionState(state);
      if (state === ConnectionState.Disconnected) {
        Alert.alert(
          "Disconnected",
          "You have been disconnected from the room.",
        );
        activeRoomIdRef.current = null;
        socketRef.current?.removeAllListeners();
        socketRef.current?.disconnect();
        socketRef.current = null;
        roomRef.current = null;
        routerRef.current.replace("/(role-pager)/(founder-tabs)/community");
      }
    };

    lkRoom
      .on(RoomEvent.ParticipantConnected, updateLKParticipants)
      .on(RoomEvent.ParticipantDisconnected, updateLKParticipants)
      .on(RoomEvent.ActiveSpeakersChanged, updateLKParticipants)
      .on(RoomEvent.TrackPublished, updateLKParticipants)
      .on(RoomEvent.TrackUnpublished, updateLKParticipants)
      .on(RoomEvent.LocalTrackPublished, updateLKParticipants)
      .on(RoomEvent.LocalTrackUnpublished, updateLKParticipants)
      .on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);

    updateLKParticipants();
    // No external deps — uses only refs (stable) and setters (stable)
  }, []);

  // Setup socket and LiveKit
  useEffect(() => {
    if (!roomId || !authToken) return;

    let socket: Socket | undefined;
    let cancelled = false;

    const setup = async () => {
      try {
        setConnectionState(ConnectionState.Connecting);
        console.log("[Room] Connecting socket to:", VOICE_API_URL);

        // Ensure audio routes to speaker by default where possible
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            // false = prefer speaker on Android (don't play through earpiece)
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: true,
          });
          console.log("[Room] Audio mode set (speaker preferred)");
        } catch (err) {
          console.warn("[Room] Failed to set audio mode:", err);
        }

        // 1. Connect Socket.IO
        socket = io(VOICE_API_URL, {
          transports: ["websocket", "polling"],
          auth: { token: authToken },
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
        });
        socketRef.current = socket;
        activeRoomIdRef.current = roomId;

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

        if (cancelled) return;

        // 2. Join room via socket → get livekitToken + data
        const result = await joinRoomViaSocket(socket!, roomId);
        if (cancelled) return;

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
        const livekitRoom = await connectToLiveKitRoom(
          result.livekitToken,
          result.livekitUrl,
        );
        if (cancelled) {
          livekitRoom.disconnect();
          return;
        }
        setRoom(livekitRoom);
        roomRef.current = livekitRoom;
        setConnectionState(ConnectionState.Connected);

        // Attach LiveKit event listeners
        attachLiveKitListeners(livekitRoom);

        // Enable mic if host/speaker
        if (
          myParticipant &&
          ["host", "co-host", "speaker"].includes(myParticipant.role)
        ) {
          await toggleMic(livekitRoom.localParticipant, true);
          setIsMicEnabled(true);
        }

        // ---- Socket.IO room event listeners ----

        socket!.on("receive_message", (data: { message: any }) => {
          const msg = normalizeMessage(data.message);
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
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
              const idx = prev.findIndex(
                (p) => p.user_id === data.participant.user_id,
              );
              if (idx >= 0) {
                // User already in list (e.g. reconnected) — update their data
                const updated = [...prev];
                updated[idx] = { ...data.participant, is_connected: true };
                return updated;
              }
              return [...prev, { ...data.participant, is_connected: true }];
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
            setServerParticipants((prev) => {
              const exists = prev.some(
                (p) => p.user_id === data.participant.user_id,
              );
              if (exists) {
                return prev.map((p) =>
                  p.user_id === data.participant.user_id
                    ? data.participant
                    : p,
                );
              }
              // Participant not in list yet (e.g. reconnected) — add them
              return [...prev, data.participant];
            });
            if (data.participant.user_id === currentUserId) {
              setMyRole(data.participant.role);
            }
          },
        );

        socket!.on(
          "participant_disconnected",
          (data: { userId: string }) => {
            setServerParticipants((prev) =>
              prev.map((p) =>
                p.user_id === data.userId
                  ? { ...p, is_connected: false }
                  : p,
              ),
            );
          },
        );

        // FIX #4: role_changed — reconnect LiveKit without tearing down socket
        socket!.on(
          "role_changed",
          (data: {
            participant: ServerParticipant;
            livekitToken: string;
            livekitUrl?: string;
          }) => {
            setMyRole(data.participant.role);
            reconnectLiveKit(
              data.livekitToken,
              data.participant.role,
              data.livekitUrl,
            );
          },
        );

        // FIX #4: mic_granted — reconnect LiveKit without tearing down socket
        socket!.on(
          "mic_granted",
          (data: {
            participant: ServerParticipant;
            livekitToken: string;
            livekitUrl?: string;
          }) => {
            setMyRole(data.participant.role);
            reconnectLiveKit(
              data.livekitToken,
              data.participant.role,
              data.livekitUrl,
            );
          },
        );

        // FIX #4: mic_revoked — reconnect LiveKit with listener permissions
        socket!.on(
          "mic_revoked",
          (data: {
            participant: ServerParticipant;
            livekitToken: string;
            livekitUrl?: string;
          }) => {
            setMyRole(data.participant.role);
            reconnectLiveKit(
              data.livekitToken,
              data.participant.role,
              data.livekitUrl,
            );
          },
        );

        socket!.on("removed_from_room", () => {
          activeRoomIdRef.current = null;
          Alert.alert("Removed", "You have been removed from the room.");
          isReconnectingLiveKitRef.current = true;
          roomRef.current?.disconnect();
          roomRef.current = null;
          socketRef.current?.removeAllListeners();
          socketRef.current?.disconnect();
          socketRef.current = null;
          router.replace("/(role-pager)/(founder-tabs)/community");
        });

        socket!.on("room_ended", () => {
          activeRoomIdRef.current = null;
          Alert.alert("Room Ended", "The host has ended this room.");
          isReconnectingLiveKitRef.current = true;
          roomRef.current?.disconnect();
          roomRef.current = null;
          socketRef.current?.removeAllListeners();
          socketRef.current?.disconnect();
          socketRef.current = null;
          router.replace("/(role-pager)/(founder-tabs)/community");
        });

        // FIX #5: Socket.IO reconnection — refresh auth token and restore room state
        socket!.on("disconnect", (reason) => {
          console.log("[Room] Socket disconnected:", reason);
          if (reason === "io server disconnect") {
            // Server forcefully disconnected — don't auto-reconnect
            return;
          }
          setConnectionState(ConnectionState.Reconnecting);
        });

        socket!.io.on("reconnect_attempt", async () => {
          // FIX #10: Refresh Supabase token before reconnecting
          try {
            const { data } = await supabase.auth.refreshSession();
            if (data.session?.access_token) {
              socket!.auth = { token: data.session.access_token };
              console.log("[Room] Refreshed auth token for reconnection");
            }
          } catch (err) {
            console.warn("[Room] Failed to refresh token:", err);
          }
        });

        socket!.io.on("reconnect", () => {
          console.log("[Room] Socket reconnected, restoring room state...");
          const currentRoomId = activeRoomIdRef.current;
          if (!currentRoomId || !socket?.connected) return;

          // Use setChatMessages callback to get current messages without stale closure
          setChatMessages((currentMessages) => {
            const lastMsg = currentMessages[currentMessages.length - 1];
            socket!.emit(
              "restore_room_state",
              {
                roomId: currentRoomId,
                lastMessageAt: lastMsg?.created_at,
              },
              (response: any) => {
                if (response.success) {
                  console.log("[Room] Room state restored after reconnect");
                  const d = response.data;
                  if (d.participants) setServerParticipants(d.participants);
                  if (d.missedMessages?.length) {
                    setChatMessages((prev) => {
                      const newMsgs = d.missedMessages
                        .map(normalizeMessage)
                        .filter(
                          (m: ChatMessage) => !prev.some((p) => p.id === m.id),
                        );
                      return [...prev, ...newMsgs];
                    });
                  }
                  // Update my role from restored server state
                  if (d.myParticipant) {
                    setMyRole(d.myParticipant.role);
                  }
                  // Reconnect LiveKit with fresh token
                  if (d.livekitToken) {
                    const me = d.myParticipant || d.participants?.find(
                      (p: ServerParticipant) => p.user_id === currentUserId,
                    );
                    reconnectLiveKit(
                      d.livekitToken,
                      me?.role || "listener",
                      d.livekitUrl,
                    );
                  }
                  setConnectionState(ConnectionState.Connected);
                } else {
                  console.error("[Room] Failed to restore room state:", response.error);
                  Alert.alert("Error", "Failed to restore room. Returning to community.");
                  activeRoomIdRef.current = null;
                  socketRef.current?.disconnect();
                  router.replace("/(role-pager)/(founder-tabs)/community");
                }
              },
            );
            // Return unchanged — we're just reading the current state
            return currentMessages;
          });
        });

        socket!.io.on("reconnect_failed", () => {
          console.error("[Room] Socket reconnection failed after all attempts");
          Alert.alert(
            "Connection Lost",
            "Unable to reconnect to the room.",
          );
          activeRoomIdRef.current = null;
          isReconnectingLiveKitRef.current = true;
          roomRef.current?.disconnect();
          roomRef.current = null;
          socketRef.current = null;
          router.replace("/(role-pager)/(founder-tabs)/community");
        });
      } catch (error: any) {
        if (cancelled) return;
        console.error("Failed to setup room:", error);
        Alert.alert("Error", `Failed to join room: ${error.message}`);
        setConnectionState(ConnectionState.Disconnected);
        socket?.disconnect();
      }
    };

    setup();

    return () => {
      cancelled = true;
      activeRoomIdRef.current = null;
      isReconnectingLiveKitRef.current = true;
      roomRef.current?.disconnect();
      roomRef.current = null;
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [roomId, authToken, currentUserId, attachLiveKitListeners, reconnectLiveKit]);

  // Toggle mic
  const handleToggleMic = async () => {
    // Prevent concurrent calls — each call to setMicrophoneEnabled recreates the
    // media track internally, which triggers the duplicate event-listener warning
    if (isMicTogglingRef.current) return;
    if (!room?.localParticipant) return;
    if (!canSpeak) {
      Alert.alert(
        "Permission Denied",
        "Only speakers and hosts can use the microphone.",
      );
      return;
    }
    isMicTogglingRef.current = true;
    const newState = !isMicEnabled;
    try {
      // Ensure speaker routing before enabling microphone
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });
    } catch (err) {
      console.warn("[Room] Failed to set audio mode before toggle:", err);
    }
    try {
      await toggleMic(room.localParticipant, newState);
      setIsMicEnabled(newState);
    } finally {
      isMicTogglingRef.current = false;
    }
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
      user_name: undefined,
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

  // Promote user to a specific role
  const handlePromote = (targetUserId: string, role: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit(
      "promote_user",
      { targetId: targetUserId, roomId, role },
      (response: any) => {
        if (!response.success) {
          Alert.alert("Error", response.error || "Failed to promote user");
        }
      },
    );
    setIsActionModalOpen(false);
  };

  // Demote user to listener
  const handleDemote = (targetUserId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit(
      "demote_user",
      { targetId: targetUserId, roomId },
      (response: any) => {
        if (!response.success) {
          Alert.alert("Error", response.error || "Failed to demote user");
        }
      },
    );
    setIsActionModalOpen(false);
  };

  // Remove user from room
  const handleRemoveUser = (targetUserId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    Alert.alert(
      "Remove User",
      "Are you sure you want to remove this user from the room?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            socket.emit(
              "remove_user",
              { targetId: targetUserId, roomId },
              (response: any) => {
                if (!response.success) {
                  Alert.alert(
                    "Error",
                    response.error || "Failed to remove user",
                  );
                }
              },
            );
            setIsActionModalOpen(false);
          },
        },
      ],
    );
  };

  // Open participant action modal
  const openParticipantActions = (
    participant: (typeof mergedParticipants)[0],
  ) => {
    setSelectedParticipant(participant);
    setIsActionModalOpen(true);
  };

  // Get available actions for a participant based on my role and their role
  const getParticipantActions = (
    participant: (typeof mergedParticipants)[0],
  ) => {
    const actions: {
      label: string;
      icon: string;
      color?: string;
      onPress: () => void;
    }[] = [];
    const targetRole = participant.role;

    if (myRole === "host") {
      if (targetRole === "listener") {
        actions.push({
          label: "Promote to Speaker",
          icon: "mic-outline",
          onPress: () => handlePromote(participant.user_id, "speaker"),
        });
        actions.push({
          label: "Promote to Co-Host",
          icon: "shield-outline",
          onPress: () => handlePromote(participant.user_id, "co-host"),
        });
      }
      if (targetRole === "speaker") {
        actions.push({
          label: "Promote to Co-Host",
          icon: "shield-outline",
          onPress: () => handlePromote(participant.user_id, "co-host"),
        });
        actions.push({
          label: "Demote to Listener",
          icon: "mic-off-outline",
          onPress: () => handleDemote(participant.user_id),
        });
      }
      if (targetRole === "co-host") {
        actions.push({
          label: "Demote to Listener",
          icon: "mic-off-outline",
          onPress: () => handleDemote(participant.user_id),
        });
      }
      if (targetRole !== "host") {
        actions.push({
          label: "Remove from Room",
          icon: "person-remove-outline",
          color: "destructive",
          onPress: () => handleRemoveUser(participant.user_id),
        });
      }
    } else if (myRole === "co-host") {
      if (targetRole === "listener") {
        actions.push({
          label: "Promote to Speaker",
          icon: "mic-outline",
          onPress: () => handlePromote(participant.user_id, "speaker"),
        });
      }
      if (targetRole === "speaker") {
        actions.push({
          label: "Demote to Listener",
          icon: "mic-off-outline",
          onPress: () => handleDemote(participant.user_id),
        });
      }
    }

    return actions;
  };

  // Render participant item
  const renderParticipant = ({
    item,
  }: {
    item: (typeof mergedParticipants)[0];
  }) => {
    const isMe = item.user_id === currentUserId;
    const hasActions =
      !isMe &&
      (myRole === "host" || myRole === "co-host") &&
      item.role !== "host" &&
      (myRole === "host" || (myRole === "co-host" && item.role !== "co-host"));

    const card = (
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
      </View>
    );

    if (hasActions) {
      return (
        <TouchableOpacity
          onPress={() => openParticipantActions(item)}
          activeOpacity={0.7}
        >
          {card}
        </TouchableOpacity>
      );
    }

    return card;
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

      {/* Participant Actions Modal */}
      <Modal
        visible={isActionModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsActionModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.actionModalOverlay}
          activeOpacity={1}
          onPress={() => setIsActionModalOpen(false)}
        >
          <View
            style={[
              styles.actionModalContainer,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {selectedParticipant && (
              <>
                <View style={styles.actionModalHeader}>
                  <View
                    style={[
                      styles.actionModalAvatar,
                      { backgroundColor: theme.brand.primary + "18" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionModalAvatarText,
                        { color: theme.brand.primary },
                      ]}
                    >
                      {selectedParticipant.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.actionModalHeaderInfo}>
                    <Text
                      style={[
                        styles.actionModalName,
                        { color: theme.text.primary },
                      ]}
                    >
                      {selectedParticipant.displayName}
                    </Text>
                    <Text
                      style={[
                        styles.actionModalRole,
                        { color: theme.text.tertiary },
                      ]}
                    >
                      {displayRole(selectedParticipant.role)}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.actionModalDivider,
                    { backgroundColor: theme.border },
                  ]}
                />
                {getParticipantActions(selectedParticipant).map(
                  (action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.actionModalItem}
                      onPress={action.onPress}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={action.icon as any}
                        size={20}
                        color={
                          action.color === "destructive"
                            ? theme.error
                            : theme.text.primary
                        }
                      />
                      <Text
                        style={[
                          styles.actionModalItemText,
                          {
                            color:
                              action.color === "destructive"
                                ? theme.error
                                : theme.text.primary,
                          },
                        ]}
                      >
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
                <TouchableOpacity
                  style={[
                    styles.actionModalCancel,
                    { backgroundColor: theme.surfaceElevated },
                  ]}
                  onPress={() => setIsActionModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.actionModalCancelText,
                      { color: theme.text.secondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

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
    paddingHorizontal: Spacing.md,
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
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    paddingTop: 8,
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
  // Participant Action Modal
  actionModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  actionModalContainer: {
    width: "80%",
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  actionModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  actionModalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  actionModalAvatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  actionModalHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  actionModalName: {
    ...Typography.presets.body,
    fontWeight: "600",
  },
  actionModalRole: {
    ...Typography.presets.caption,
    textTransform: "capitalize",
  },
  actionModalDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs,
  },
  actionModalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: Layout.radius.md,
  },
  actionModalItemText: {
    ...Typography.presets.body,
    fontWeight: "500",
  },
  actionModalCancel: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: Layout.radius.md,
    marginTop: Spacing.xs,
  },
  actionModalCancelText: {
    ...Typography.presets.body,
    fontWeight: "600",
  },
});
