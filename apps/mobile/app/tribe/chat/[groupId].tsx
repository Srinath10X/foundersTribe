import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { io, Socket } from "socket.io-client";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Typography, Spacing, Layout } from "@/constants/DesignSystem";
import * as tribeApi from "@/lib/tribeApi";
import MessageBubble from "@/components/MessageBubble";
import MembershipGateModal from "@/components/MembershipGateModal";

const TRIBE_API_URL =
  process.env.EXPO_PUBLIC_TRIBE_API_URL || "http://192.168.1.4:3003";

/* ================================================================ */
/*  Chat Screen                                                     */
/* ================================================================ */

export default function GroupChatScreen() {
  const { groupId, tribeId } = useLocalSearchParams<{
    groupId: string;
    tribeId: string;
  }>();
  const gid = Array.isArray(groupId) ? groupId[0] : groupId;
  const tid = Array.isArray(tribeId) ? tribeId[0] : tribeId;

  const router = useRouter();
  const { theme } = useTheme();
  const { session } = useAuth();
  const token = session?.access_token || "";
  const userId = session?.user?.id || "";

  /* ── State ─────────────────────────────────────────────────── */

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editMsg, setEditMsg] = useState<any>(null);
  const [activeActions, setActiveActions] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("Chat");
  const [isReadonly, setIsReadonly] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [showMembershipGate, setShowMembershipGate] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  /* ── Socket.io ─────────────────────────────────────────────── */

  useEffect(() => {
    if (!token || !gid) return;

    const socket = io(TRIBE_API_URL, {
      transports: ["websocket"],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Chat] Socket connected:", socket.id);
      socket.emit("join_group", { groupId: gid }, (res: any) => {
        if (res?.error) console.warn("[Chat] join_group error:", res.error);
      });
    });

    socket.on("connect_error", (err) => {
      console.error("[Chat] Socket error:", err.message);
    });

    // Listen for new messages from others
    socket.on("message", (data: { groupId: string; message: any }) => {
      if (data.groupId === gid) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });

    // Listen for message edits
    socket.on(
      "message_updated",
      (data: {
        groupId: string;
        messageId: string;
        content: string;
        editedAt: string;
      }) => {
        if (data.groupId === gid) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.messageId
                ? { ...m, content: data.content, edited_at: data.editedAt }
                : m,
            ),
          );
        }
      },
    );

    // Listen for message deletions
    socket.on(
      "message_removed",
      (data: { groupId: string; messageId: string }) => {
        if (data.groupId === gid) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.messageId ? { ...m, is_deleted: true } : m,
            ),
          );
        }
      },
    );

    // Typing indicators
    socket.on(
      "user_typing",
      (_data: { groupId: string; userId: string }) => {
        // Could show typing indicator UI
      },
    );

    // Real-time reaction updates
    socket.on(
      "reaction_added",
      (data: { groupId: string; messageId: string; emoji: string; userId: string }) => {
        if (data.groupId === gid) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== data.messageId) return m;
              const reactions = [...(m.reactions || [])];
              const idx = reactions.findIndex((r: any) => r.emoji === data.emoji);
              if (idx >= 0) {
                reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1 };
              } else {
                reactions.push({ emoji: data.emoji, count: 1, user_reacted: false });
              }
              return { ...m, reactions };
            }),
          );
        }
      },
    );

    socket.on(
      "reaction_removed",
      (data: { groupId: string; messageId: string; emoji: string; userId: string }) => {
        if (data.groupId === gid) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== data.messageId) return m;
              const reactions = (m.reactions || [])
                .map((r: any) =>
                  r.emoji === data.emoji
                    ? { ...r, count: Math.max(0, r.count - 1) }
                    : r,
                )
                .filter((r: any) => r.count > 0);
              return { ...m, reactions };
            }),
          );
        }
      },
    );

    return () => {
      socket.emit("leave_group", { groupId: gid });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, gid]);

  /* ── Load messages ─────────────────────────────────────────── */

  const loadMessages = useCallback(async () => {
    if (!token || !gid) return;
    setLoading(true);
    try {
      // Auto-join group first (backend returns 409 if already a member, which is fine)
      if (tid) {
        try {
          await tribeApi.joinGroup(token, tid, gid);
        } catch {
          // 409 = already a member — expected
        }
      }

      const res = await tribeApi.getMessages(token, gid);
      // Backend returns messages in DESC order — reverse for chronological display
      const msgs = res?.messages ?? [];
      setMessages(msgs.reverse());
    } catch (e: any) {
      console.error("[Chat] Load messages:", e.message);
    } finally {
      setLoading(false);
    }
  }, [token, gid, tid]);

  // Check tribe membership, load group metadata, and check user's tribe role
  useEffect(() => {
    if (!token || !gid || !tid) return;
    (async () => {
      // Check tribe membership first
      try {
        const members = await tribeApi.getTribeMembers(token, tid);
        const memberList = Array.isArray(members) ? members : [];
        const me = memberList.find((m: any) => m.user_id === userId);
        if (!me) {
          setShowMembershipGate(true);
          return;
        }
        setIsGroupAdmin(
          me.role === "owner" || me.role === "admin" || me.role === "moderator",
        );
      } catch (e) {
        // getTribeMembers returns 403 for non-members
        setShowMembershipGate(true);
        return;
      }

      try {
        const group = await tribeApi.getGroup(token, tid, gid);
        if (group) {
          setGroupName(group.name || "Chat");
          setIsReadonly(!!group.is_readonly);
        }
      } catch (e) {
        /* noop */
      }
    })();
  }, [token, gid, tid, userId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  /* ── Send / Edit / Delete ──────────────────────────────────── */

  const handleSend = async () => {
    if (!text.trim() || !token || !gid) return;
    setSending(true);
    try {
      if (editMsg) {
        // Editing existing message
        const updated = await tribeApi.editMessage(
          token,
          gid,
          editMsg.id,
          text.trim(),
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editMsg.id
              ? { ...m, content: text.trim(), edited_at: new Date().toISOString() }
              : m,
          ),
        );
        socketRef.current?.emit("message_edited", {
          groupId: gid,
          messageId: editMsg.id,
          content: text.trim(),
        });
        setEditMsg(null);
      } else {
        // Sending new message
        const msg = await tribeApi.sendMessage(token, gid, {
          content: text.trim(),
          reply_to_id: replyTo?.id,
        });
        setMessages((prev) => [...prev, msg]);
        socketRef.current?.emit("new_message", {
          groupId: gid,
          message: msg,
        });
        setReplyTo(null);
      }
      setText("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (msgId: string) => {
    Alert.alert("Delete Message", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await tribeApi.deleteMessage(token, gid!, msgId);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId ? { ...m, is_deleted: true } : m,
              ),
            );
            socketRef.current?.emit("message_deleted", {
              groupId: gid,
              messageId: msgId,
            });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!token || !gid) return;
    try {
      await tribeApi.addReaction(token, gid, msgId, emoji);
      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) return m;
          const reactions = [...(m.reactions || [])];
          const idx = reactions.findIndex(
            (r: any) => r.emoji === emoji,
          );
          if (idx >= 0) {
            reactions[idx] = {
              ...reactions[idx],
              count: reactions[idx].count + 1,
              user_reacted: true,
            };
          } else {
            reactions.push({ emoji, count: 1, user_reacted: true });
          }
          return { ...m, reactions };
        }),
      );
      // Broadcast to other users
      socketRef.current?.emit("reaction_added", {
        groupId: gid,
        messageId: msgId,
        emoji,
      });
    } catch (e: any) {
      // Could be "already reacted"
      console.warn("[Chat] Reaction:", e.message);
    }
  };

  const startEdit = (msg: any) => {
    setEditMsg(msg);
    setText(msg.content || "");
    inputRef.current?.focus();
  };

  const cancelEditReply = () => {
    setEditMsg(null);
    setReplyTo(null);
    setText("");
  };

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.headerTitle, { color: theme.text.primary }]}
            numberOfLines={1}
          >
            # {groupName}
          </Text>
          {isReadonly && (
            <Text style={[styles.headerSub, { color: theme.text.tertiary }]}>
              Announcements
            </Text>
          )}
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.sender_id === userId}
              isAdmin={isGroupAdmin}
              onReply={() => {
                setReplyTo(item);
                inputRef.current?.focus();
              }}
              onEdit={() => startEdit(item)}
              onDelete={() => handleDelete(item.id)}
              onReact={(emoji) => handleReact(item.id, emoji)}
              showActions={activeActions === item.id}
              onToggleActions={() =>
                setActiveActions((prev) =>
                  prev === item.id ? null : item.id,
                )
              }
            />
          )}
          keyExtractor={(item, idx) => item.id || `msg-${idx}`}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyChatContainer}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={theme.text.muted}
              />
              <Text
                style={[
                  styles.emptyChatText,
                  { color: theme.text.tertiary },
                ]}
              >
                No messages yet. Be the first to say hello!
              </Text>
            </View>
          }
        />
      )}

      {/* Reply / edit banner */}
      {(replyTo || editMsg) && (
        <View
          style={[
            styles.replyBanner,
            { backgroundColor: theme.surfaceElevated, borderTopColor: theme.border },
          ]}
        >
          <Ionicons
            name={editMsg ? "pencil-outline" : "arrow-undo-outline"}
            size={16}
            color={theme.brand.primary}
          />
          <Text
            style={[styles.replyBannerText, { color: theme.text.secondary }]}
            numberOfLines={1}
          >
            {editMsg
              ? `Editing: ${editMsg.content?.slice(0, 50)}`
              : `Replying to: ${replyTo.content?.slice(0, 50) || "Media"}`}
          </Text>
          <TouchableOpacity onPress={cancelEditReply}>
            <Ionicons name="close" size={18} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      {(!isReadonly || isGroupAdmin) && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  color: theme.text.primary,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Type a message…"
              placeholderTextColor={theme.text.muted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={10000}
              onFocus={() => setActiveActions(null)}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: text.trim()
                    ? theme.brand.primary
                    : theme.surfaceElevated,
                },
              ]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color={theme.text.inverse} />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={
                    text.trim() ? theme.text.inverse : theme.text.muted
                  }
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── Membership Gate Dialog ──────────────────────── */}
      <MembershipGateModal
        visible={showMembershipGate}
        onClose={() => {
          setShowMembershipGate(false);
          router.back();
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  msgList: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  emptyChatContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyChatText: {
    ...Typography.presets.bodySmall,
    textAlign: "center",
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
  },
  replyBannerText: { ...Typography.presets.caption, flex: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.sm,
    paddingBottom: Platform.OS === "ios" ? Spacing.lg : Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.xs,
  },
  input: {
    flex: 1,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 120,
    borderWidth: 1,
    ...Typography.presets.body,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
