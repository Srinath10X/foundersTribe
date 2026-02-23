import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { FlowScreen, FlowTopBar, SurfaceCard, T, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { ChatMessage, useContractRealtimeChat } from "@/hooks/useContractRealtimeChat";

export default function TalentChatThreadScreen() {
  const params = useLocalSearchParams<{ contractId?: string; title?: string }>();
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const [draft, setDraft] = useState("");
  const { contractId, messages, loading, sending, error, isRealtimeConnected, currentUserId, sendTextMessage, retryFailedMessage } =
    useContractRealtimeChat({ contractId: params.contractId });
  const title = params.title || "Contract Chat";

  const statusLabel = useMemo(() => {
    if (!contractId) return "No active contract";
    return isRealtimeConnected ? "Live" : "Connecting...";
  }, [contractId, isRealtimeConnected]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendTextMessage(text);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id === currentUserId;
    const pendingOrFailed = item.pending || item.failed;
    return (
      <View style={isMine ? styles.rightWrap : styles.leftWrap}>
        <TouchableOpacity
          activeOpacity={item.failed ? 0.75 : 1}
          disabled={!item.failed}
          onPress={() => retryFailedMessage(item)}
        >
          <View
            style={[
              styles.msg,
              {
                backgroundColor: isMine ? palette.accent : palette.surface,
                opacity: pendingOrFailed ? 0.72 : 1,
              },
            ]}
          >
            <T color={isMine ? "#fff" : palette.text} style={styles.msgText}>
              {item.body || (item.message_type === "file" ? "Shared a file" : "System message")}
            </T>
          </View>
        </TouchableOpacity>
        <T weight="medium" color={palette.subText} style={[styles.time, { textAlign: isMine ? "right" : "left" }]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {item.pending ? " • sending" : ""}
          {item.failed ? " • failed (tap to retry)" : ""}
        </T>
      </View>
    );
  };

  return (
    <FlowScreen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <FlowTopBar title={String(title)} onLeftPress={nav.back} right="ellipsis-horizontal" onRightPress={() => {}} />

        <View style={[styles.body, { backgroundColor: palette.bg }]}>
          <SurfaceCard style={styles.contextCard}>
            <T weight="semiBold" color={palette.subText} style={styles.small}>CONTRACT CHAT</T>
            <T weight="bold" color={palette.text} style={styles.title}>
              {contractId ? `Contract #${contractId.slice(0, 8)}` : "No active contract found"}
            </T>
            <T weight="medium" color={palette.subText} style={styles.small}>
              {statusLabel}
            </T>
            {error ? (
              <T weight="medium" color={palette.accent} style={[styles.small, { marginTop: 6 }]}>
                {error}
              </T>
            ) : null}
          </SurfaceCard>

          <View style={styles.chatCol}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={palette.accent} />
              </View>
            ) : (
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={messages.length === 0 ? styles.emptyChat : undefined}
                renderItem={renderItem}
                ListEmptyComponent={
                  <T weight="medium" color={palette.subText} style={styles.emptyText}>
                    No messages yet. Start the conversation.
                  </T>
                }
              />
            )}
          </View>
        </View>

        <View style={[styles.composer, { backgroundColor: palette.surface, borderTopColor: palette.borderLight }]}>
          <TouchableOpacity style={[styles.circle, { backgroundColor: palette.card }]}>
            <Ionicons name="add" size={24} color={palette.subText} />
          </TouchableOpacity>
          <TextInput
            placeholder="Message founder..."
            placeholderTextColor={palette.subText}
            style={[styles.input, { color: palette.text, backgroundColor: palette.card }]}
            value={draft}
            onChangeText={setDraft}
            editable={!!contractId}
          />
          <TouchableOpacity
            style={[styles.circle, { backgroundColor: palette.accent, opacity: !draft.trim() || !contractId || sending ? 0.6 : 1 }]}
            onPress={onSend}
            disabled={!draft.trim() || !contractId || sending}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  contextCard: { padding: 12 },
  small: { fontSize: 11, letterSpacing: 0.8 },
  title: { fontSize: 16, marginTop: 3 },
  chatCol: { flex: 1, paddingTop: 14, gap: 12 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyChat: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13 },
  leftWrap: { alignItems: "flex-start" },
  rightWrap: { alignItems: "flex-end" },
  msg: { borderRadius: 16, padding: 12, maxWidth: "84%", marginTop: 8 },
  msgText: { fontSize: 14, lineHeight: 21 },
  time: { fontSize: 11 },
  composer: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 8 },
  circle: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, height: 46, borderRadius: 23, paddingHorizontal: 14, fontFamily: "Poppins_500Medium", fontSize: 14 },
});
