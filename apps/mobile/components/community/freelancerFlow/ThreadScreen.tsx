import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useContractRealtimeChat } from "@/hooks/useContractRealtimeChat";

import { Avatar, FlowScreen, FlowTopBar, T, people, useFlowNav, useFlowPalette } from "./shared";

type ChatRow =
  | { type: "date"; key: string; label: string }
  | { type: "message"; key: string; message: any; showAvatar: boolean };

type ThreadScreenProps = {
  threadId?: string;
  title?: string;
  avatar?: string;
};

function formatDayLabel(dateInput: string): string {
  const d = new Date(dateInput);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msgStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.floor((todayStart - msgStart) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function buildRows(messages: any[]): ChatRow[] {
  const rows: ChatRow[] = [];
  let prevDayKey: string | null = null;

  messages.forEach((message, index) => {
    const dayKey = new Date(message.created_at).toDateString();
    if (dayKey !== prevDayKey) {
      rows.push({
        type: "date",
        key: `date-${dayKey}`,
        label: formatDayLabel(message.created_at),
      });
      prevDayKey = dayKey;
    }

    const nextMessage = messages[index + 1];
    const showAvatar = !nextMessage || nextMessage.sender_id !== message.sender_id;

    rows.push({
      type: "message",
      key: `message-${message.id}`,
      message,
      showAvatar,
    });
  });

  return rows;
}

export default function ThreadScreen({ threadId, title, avatar }: ThreadScreenProps) {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatRow>>(null);

  const [draft, setDraft] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const {
    currentUserId,
    messages,
    loading,
    sending,
    error,
    sendTextMessage,
    retryFailedMessage,
  } = useContractRealtimeChat({ contractId: threadId });

  const participantName = title || "Conversation";
  const participantAvatar = avatar || people.alex;

  const rows = useMemo(() => buildRows(messages || []), [messages]);
  const resolvedTabBarSpace = Math.max(tabBarHeight - 30, 0 + insets.bottom);
  const footerBottom = keyboardOpen ? 8 : resolvedTabBarSpace + 2;
  const listBottomPadding = keyboardOpen ? 88 : resolvedTabBarSpace + 50;

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 10);
    return () => clearTimeout(timer);
  }, [rows.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    await sendTextMessage(body);
  };

  return (
    <FlowScreen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 92 : 10}
      >
        <FlowTopBar title={participantName} onLeftPress={nav.back} right="ellipsis-horizontal" onRightPress={() => {}} />

        <View style={[styles.body, { backgroundColor: palette.bg }]}> 
          {error ? (
            <View style={[styles.errorPill, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}> 
              <T weight="regular" color={palette.accent} style={styles.errorText}>
                {error}
              </T>
            </View>
          ) : null}

          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.chatContent, { paddingBottom: listBottomPadding }]}
            renderItem={({ item }) => {
              if (item.type === "date") {
                return (
                  <View style={styles.dateWrap}>
                    <View style={[styles.datePill, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}> 
                      <T weight="regular" color={palette.subText} style={styles.dateText}>
                        {item.label}
                      </T>
                    </View>
                  </View>
                );
              }

              const { message, showAvatar } = item;
              const isMine = message.sender_id === currentUserId;
              const timeLabel = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return (
                <View style={[styles.row, isMine ? styles.rowMine : styles.rowPeer]}>
                  {!isMine ? (
                    showAvatar ? <Avatar source={participantAvatar} size={24} /> : <View style={{ width: 24 }} />
                  ) : (
                    <View style={{ width: 24 }} />
                  )}

                  <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapPeer]}>
                    {!isMine && showAvatar ? (
                      <T weight="medium" color={palette.subText} style={styles.senderName} numberOfLines={1}>
                        {participantName}
                      </T>
                    ) : null}
                    <TouchableOpacity
                      activeOpacity={message.failed ? 0.7 : 1}
                      disabled={!message.failed}
                      onPress={() => retryFailedMessage(message)}
                    >
                      <View
                        style={[
                          styles.bubble,
                          isMine
                            ? { backgroundColor: palette.accent, borderColor: palette.accent }
                            : { backgroundColor: palette.surface, borderColor: palette.borderLight },
                          message.pending || message.failed ? { opacity: 0.7 } : null,
                        ]}
                      >
                        <T weight="regular" color={isMine ? "#fff" : palette.text} style={styles.bubbleText}>
                          {message.body || "Message"}
                        </T>
                      </View>
                    </TouchableOpacity>
                    <T weight="regular" color={palette.subText} style={[styles.time, { textAlign: isMine ? "right" : "left" }]}> 
                      {timeLabel}
                      {message.pending ? " • sending" : ""}
                      {message.failed ? " • failed" : ""}
                    </T>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <T weight="regular" color={palette.subText} style={styles.emptyText}>
                  {loading ? "Loading messages..." : "No messages yet"}
                </T>
              </View>
            }
          />
        </View>

        <View style={[styles.footerWrap, { bottom: footerBottom }]}> 
          <View style={[styles.composer, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}> 
            <TouchableOpacity style={[styles.sideBtn, { backgroundColor: palette.card }]}> 
              <Ionicons name="add" size={18} color={palette.subText} />
            </TouchableOpacity>
            <TextInput
              placeholder="Type a message"
              placeholderTextColor={palette.subText}
              style={[styles.input, { color: palette.text, backgroundColor: palette.card }]}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={1200}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: palette.accent, opacity: draft.trim() && !sending ? 1 : 0.5 }]}
              onPress={handleSend}
              disabled={!draft.trim() || sending}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
  errorPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  errorText: { fontSize: 10, lineHeight: 13 },
  chatContent: { paddingBottom: 16 },
  dateWrap: { alignItems: "center", marginVertical: 8 },
  datePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dateText: { fontSize: 10, lineHeight: 13 },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 8,
  },
  rowMine: { justifyContent: "flex-end" },
  rowPeer: { justifyContent: "flex-start" },
  bubbleWrap: { maxWidth: "84%" },
  bubbleWrapMine: { alignItems: "flex-end" },
  bubbleWrapPeer: { alignItems: "flex-start" },
  senderName: { marginBottom: 2, fontSize: 10, lineHeight: 12 },
  bubble: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  bubbleText: { fontSize: 12, lineHeight: 17 },
  time: { marginTop: 2, fontSize: 10, lineHeight: 12 },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  composer: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  sideBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 34,
    maxHeight: 96,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  emptyWrap: { paddingTop: 36, alignItems: "center" },
  emptyText: { fontSize: 11, lineHeight: 14 },
});
