import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import {
  FlowScreen,
  FlowTopBar,
  SurfaceCard,
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
              },
            ]}
          >
            <T color={isMine ? "#FFFFFF" : palette.text} style={styles.msgText}>
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
          <SurfaceCard style={styles.contractCard}>
            <View style={styles.kpiHead}>
              <View>
                <T weight="semiBold" color={palette.subText} style={styles.mini}>CONTRACT</T>
                <T weight="bold" color={palette.text} style={styles.price}>
                  {contractId ? `#${contractId.slice(0, 8)}` : "Not Available"}
                </T>
              </View>
              <View>
                <T weight="semiBold" color={palette.subText} style={styles.mini}>STATUS</T>
                <T weight="bold" color={palette.text} style={styles.deadline}>{statusLabel}</T>
              </View>
            </View>
            {error ? (
              <T weight="medium" color={palette.accent} style={[styles.mini, { marginTop: 8 }]}>{error}</T>
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
            placeholder="Message freelancer..."
            placeholderTextColor={palette.subText}
            style={[styles.input, { color: palette.text, backgroundColor: palette.card }]}
            value={draft}
            onChangeText={setDraft}
            editable={!!contractId}
          />
          <TouchableOpacity
            style={[styles.send, { backgroundColor: palette.accent, opacity: !draft.trim() || !contractId || sending ? 0.6 : 1 }]}
            onPress={onSend}
            disabled={!draft.trim() || !contractId || sending}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 14 },
  contractCard: { padding: 14 },
  kpiHead: { flexDirection: "row", justifyContent: "space-between" },
  mini: { fontSize: 10, letterSpacing: 0.8 },
  price: { fontSize: 21, marginTop: 2 },
  deadline: { fontSize: 17, marginTop: 2 },
  chatCol: { flex: 1, paddingTop: 14, gap: 12 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyChat: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13 },
  leftMsgWrap: { alignItems: "flex-start" },
  rightMsgWrap: { alignItems: "flex-end" },
  msg: { borderRadius: 18, padding: 13, maxWidth: "84%", marginTop: 8 },
  leftMsg: { borderBottomLeftRadius: 8 },
  rightMsg: { borderBottomRightRadius: 8 },
  msgText: { fontSize: 14, lineHeight: 21 },
  avatarRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 7 },
  time: { fontSize: 12 },
  composer: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 8 },
  circle: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  input: { flex: 1, height: 48, borderRadius: 24, paddingHorizontal: 16, fontFamily: "Poppins_500Medium", fontSize: 14 },
  send: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
});
