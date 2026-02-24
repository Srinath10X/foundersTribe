import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  FlowScreen,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { ChatMessage, useContractRealtimeChat } from "@/hooks/useContractRealtimeChat";

export default function ContractChatThreadScreen() {
  const params = useLocalSearchParams<{ contractId?: string; title?: string }>();
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  const [draft, setDraft] = useState("");

  const {
    contractId,
    messages,
    loading,
    sending,
    error,
    isRealtimeConnected,
    currentUserId,
    sendTextMessage,
    retryFailedMessage,
  } = useContractRealtimeChat({ contractId: params.contractId });

  const title = params.title || "Contract Chat";

  const statusLabel = useMemo(() => {
    if (!contractId) return "No active contract";
    return isRealtimeConnected ? "Live" : "Connecting";
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
      <View style={isMine ? styles.rightMsgWrap : styles.leftMsgWrap}>
        <TouchableOpacity
          activeOpacity={item.failed ? 0.75 : 1}
          disabled={!item.failed}
          onPress={() => retryFailedMessage(item)}
        >
          <View
            style={[
              styles.msg,
              isMine ? styles.rightMsg : styles.leftMsg,
              {
                backgroundColor: isMine ? palette.accent : palette.surface,
                opacity: pendingOrFailed ? 0.72 : 1,
                borderColor: palette.borderLight,
              },
            ]}
          >
            <T color={isMine ? "#FFFFFF" : palette.text} style={styles.msgText}>
              {item.body || (item.message_type === "file" ? "Shared a file" : "System message")}
            </T>
          </View>
        </TouchableOpacity>
        <T weight="regular" color={palette.subText} style={[styles.time, { textAlign: isMine ? "right" : "left" }]}>
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 84 : 0}
      >
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle} numberOfLines={1}>{String(title)}</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>{statusLabel}</T>
          </View>
        </View>

        <View style={[styles.chatBody, { backgroundColor: palette.bg }]}> 
          {error ? (
            <T weight="regular" color={palette.accent} style={styles.errorText}>{error}</T>
          ) : null}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={palette.accent} />
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={messages.length === 0 ? styles.emptyChat : styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<T weight="regular" color={palette.subText} style={styles.emptyText}>No messages yet. Start the conversation.</T>}
            />
          )}
        </View>

        <View style={[styles.composer, { backgroundColor: palette.surface, borderTopColor: palette.borderLight }]}> 
          <TouchableOpacity style={[styles.circle, { backgroundColor: palette.card }]}>
            <Ionicons name="add" size={20} color={palette.subText} />
          </TouchableOpacity>
          <TextInput
            placeholder="Message freelancer..."
            placeholderTextColor={palette.subText}
            style={[styles.input, { color: palette.text, backgroundColor: palette.card }]}
            value={draft}
            onChangeText={setDraft}
            editable={!!contractId}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.send, { backgroundColor: palette.accent, opacity: !draft.trim() || !contractId || sending ? 0.6 : 1 }]}
            onPress={onSend}
            disabled={!draft.trim() || !contractId || sending}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: { fontSize: 14, lineHeight: 19 },
  pageSubtitle: { marginTop: 1, fontSize: 11, lineHeight: 14 },
  chatBody: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },
  errorText: { fontSize: 11, lineHeight: 14, marginBottom: 6 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyChat: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 11, lineHeight: 14 },
  listContent: { paddingBottom: 8 },
  leftMsgWrap: { alignItems: "flex-start", marginBottom: 6 },
  rightMsgWrap: { alignItems: "flex-end", marginBottom: 6 },
  msg: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: "84%",
    borderWidth: 1,
  },
  leftMsg: { borderBottomLeftRadius: 8 },
  rightMsg: { borderBottomRightRadius: 8 },
  msgText: { fontSize: 12, lineHeight: 16 },
  time: { marginTop: 2, fontSize: 10, lineHeight: 13 },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  circle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 92,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  send: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
});
