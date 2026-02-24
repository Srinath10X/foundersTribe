import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { FlowScreen, FlowTopBar, SurfaceCard, T, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { ChatMessage, useContractRealtimeChat } from "@/hooks/useContractRealtimeChat";

type ChatRow =
  | { type: "date"; key: string; label: string }
  | { type: "message"; key: string; message: ChatMessage };

function formatDateLabel(dateInput: string): string {
  const d = new Date(dateInput);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfMsgDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function buildRows(messages: ChatMessage[]): ChatRow[] {
  const rows: ChatRow[] = [];
  let prevDateKey: string | null = null;
  for (const msg of messages) {
    const dayKey = new Date(msg.created_at).toDateString();
    if (prevDateKey !== dayKey) {
      rows.push({
        type: "date",
        key: `date-${dayKey}`,
        label: formatDateLabel(msg.created_at),
      });
      prevDateKey = dayKey;
    }
    rows.push({ type: "message", key: `msg-${msg.id}`, message: msg });
  }
  return rows;
}

const DEMO_CURRENT_USER_ID = "demo-me";

const DUMMY_THREAD_MESSAGES: Record<string, ChatMessage[]> = {
  m1: [
    {
      id: "m1-1",
      contract_id: "demo",
      sender_id: "founder-1",
      recipient_id: DEMO_CURRENT_USER_ID,
      message_type: "text",
      body: "Can you send the updated dashboard UI today?",
      file_url: null,
      metadata: null,
      read_at: null,
      created_at: "2026-02-24T09:52:00+05:30",
    },
    {
      id: "m1-2",
      contract_id: "demo",
      sender_id: DEMO_CURRENT_USER_ID,
      recipient_id: "founder-1",
      message_type: "text",
      body: "Yes. I will share v2 by 6 PM.",
      file_url: null,
      metadata: null,
      read_at: null,
      created_at: "2026-02-24T10:02:00+05:30",
    },
  ],
  m2: [
    {
      id: "m2-1",
      contract_id: "demo",
      sender_id: "founder-2",
      recipient_id: DEMO_CURRENT_USER_ID,
      message_type: "text",
      body: "Looks good. Let us freeze scope for this sprint.",
      file_url: null,
      metadata: null,
      read_at: null,
      created_at: "2026-02-24T09:18:00+05:30",
    },
  ],
  m3: [
    {
      id: "m3-1",
      contract_id: "demo",
      sender_id: "team-1",
      recipient_id: DEMO_CURRENT_USER_ID,
      message_type: "text",
      body: "Milestone approved. Please begin phase 2.",
      file_url: null,
      metadata: null,
      read_at: null,
      created_at: "2026-02-23T18:30:00+05:30",
    },
    {
      id: "m3-2",
      contract_id: "demo",
      sender_id: DEMO_CURRENT_USER_ID,
      recipient_id: "team-1",
      message_type: "text",
      body: "Confirmed. I will share ETA tonight.",
      file_url: null,
      metadata: null,
      read_at: null,
      created_at: "2026-02-23T18:45:00+05:30",
    },
  ],
  m4: [
    {
      id: "m4-1",
      contract_id: "demo",
      sender_id: "founder-3",
      recipient_id: DEMO_CURRENT_USER_ID,
      message_type: "text",
      body: "Can we do a quick sync on timeline changes?",
      file_url: null,
      metadata: null,
      read_at: null,
      created_at: "2026-02-22T11:05:00+05:30",
    },
  ],
};

export default function TalentChatThreadScreen() {
  const params = useLocalSearchParams<{ contractId?: string; threadId?: string; title?: string }>();
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const [draft, setDraft] = useState("");
  const { contractId, messages, loading, sending, error, isRealtimeConnected, currentUserId, sendTextMessage, retryFailedMessage } =
    useContractRealtimeChat({ contractId: params.contractId });
  const title = params.title || "Contract Chat";
  const localPreviewMessages = useMemo(() => DUMMY_THREAD_MESSAGES[params.threadId ?? ""] ?? [], [params.threadId]);
  const effectiveMessages = contractId ? messages : localPreviewMessages;
  const viewerId = currentUserId ?? DEMO_CURRENT_USER_ID;

  const statusLabel = useMemo(() => {
    if (!contractId) return params.threadId ? "Preview mode" : "No active contract";
    return isRealtimeConnected ? "Live updates" : "Connecting...";
  }, [contractId, isRealtimeConnected, params.threadId]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendTextMessage(text);
  };

  const rows = useMemo(() => buildRows(effectiveMessages), [effectiveMessages]);

  const renderItem = ({ item }: { item: ChatRow }) => {
    if (item.type === "date") {
      return (
        <View style={styles.dateWrap}>
          <View style={[styles.datePill, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
            <T weight="regular" color={palette.subText} style={styles.dateText}>
              {item.label}
            </T>
          </View>
        </View>
      );
    }

    const msg = item.message;
    const isMine = msg.sender_id === viewerId;
    const pendingOrFailed = msg.pending || msg.failed;
    const timeLabel = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        {!isMine ? (
          <View style={[styles.peerAvatar, { backgroundColor: palette.borderLight }]}>
            <Ionicons name="person-outline" size={12} color={palette.subText} />
          </View>
        ) : null}

        <View style={[styles.msgWrap, isMine ? styles.msgWrapMine : styles.msgWrapOther]}>
          <TouchableOpacity
            activeOpacity={msg.failed ? 0.75 : 1}
            disabled={!msg.failed}
            onPress={() => retryFailedMessage(msg)}
          >
            <View
              style={[
                styles.msgBubble,
                {
                  backgroundColor: isMine ? palette.accent : palette.surface,
                  borderColor: isMine ? palette.accent : palette.borderLight,
                  opacity: pendingOrFailed ? 0.72 : 1,
                },
              ]}
            >
              <T color={isMine ? "#fff" : palette.text} style={styles.msgText}>
                {msg.body || (msg.message_type === "file" ? "Shared a file" : "System message")}
              </T>
            </View>
          </TouchableOpacity>

          <T
            weight="regular"
            color={palette.subText}
            style={[styles.time, { textAlign: isMine ? "right" : "left" }]}
          >
            {timeLabel}
            {msg.pending ? " • sending" : ""}
            {msg.failed ? " • failed" : ""}
          </T>
        </View>
      </View>
    );
  };

  return (
    <FlowScreen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 82 : 0}
      >
        <FlowTopBar title={String(title)} onLeftPress={nav.back} right="ellipsis-horizontal" onRightPress={() => {}} />

        <View style={[styles.body, { backgroundColor: palette.bg }]}>
          <SurfaceCard style={styles.contextCard}>
            <View style={styles.contextTop}>
              <T weight="medium" color={palette.text} style={styles.contextTitle}>
                {contractId ? `Contract #${contractId.slice(0, 8)}` : params.threadId ? "Conversation preview" : "No active contract"}
              </T>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isRealtimeConnected ? "rgba(46,204,113,0.15)" : palette.borderLight,
                  },
                ]}
              >
                <T
                  weight="regular"
                  color={isRealtimeConnected ? "#2ECC71" : palette.subText}
                  style={styles.statusText}
                >
                  {statusLabel}
                </T>
              </View>
            </View>
            <T weight="regular" color={palette.subText} style={styles.contextSub}>
              {error ? error : contractId ? "Tap a failed message to retry." : "This is a local preview conversation."}
            </T>
          </SurfaceCard>

          <View style={styles.chatCol}>
            {contractId && loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={palette.accent} />
              </View>
            ) : (
              <FlatList
                data={rows}
                keyExtractor={(item) => item.key}
                contentContainerStyle={rows.length === 0 ? styles.emptyChat : styles.chatContent}
                renderItem={renderItem}
                ListEmptyComponent={
                  <T weight="regular" color={palette.subText} style={styles.emptyText}>
                    No messages yet. Start the conversation.
                  </T>
                }
              />
            )}
          </View>
        </View>

        <View style={[styles.composer, { backgroundColor: palette.surface, borderTopColor: palette.borderLight }]}>
          <TouchableOpacity style={[styles.iconBtnComposer, { backgroundColor: palette.card }]}>
            <Ionicons name="attach-outline" size={18} color={palette.subText} />
          </TouchableOpacity>
          <TextInput
            placeholder="Message founder..."
            placeholderTextColor={palette.subText}
            style={[styles.input, { color: palette.text, backgroundColor: palette.card }]}
            value={draft}
            onChangeText={setDraft}
            editable={!!contractId}
            multiline
            maxLength={1200}
          />
          <TouchableOpacity
            style={[styles.iconBtnComposer, { backgroundColor: palette.accent, opacity: !draft.trim() || !contractId || sending ? 0.6 : 1 }]}
            onPress={onSend}
            disabled={!draft.trim() || !contractId || sending}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="arrow-up" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  contextCard: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  contextTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  contextTitle: { fontSize: 13, lineHeight: 17, letterSpacing: -0.1 },
  contextSub: { marginTop: 4, fontSize: 11, lineHeight: 14 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 10, lineHeight: 13 },
  chatCol: { flex: 1, paddingTop: 10 },
  chatContent: { paddingVertical: 6 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyChat: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 12, lineHeight: 16 },
  dateWrap: { alignItems: "center", marginVertical: 8 },
  datePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dateText: { fontSize: 10, lineHeight: 13 },
  msgRow: { flexDirection: "row", marginTop: 8, alignItems: "flex-end" },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  peerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginBottom: 16,
  },
  msgWrap: { maxWidth: "84%" },
  msgWrapMine: { alignItems: "flex-end" },
  msgWrapOther: { alignItems: "flex-start" },
  msgBubble: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  msgText: { fontSize: 12, lineHeight: 17 },
  time: { marginTop: 2, fontSize: 10, lineHeight: 13 },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  iconBtnComposer: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 108,
    borderRadius: 19,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
});
