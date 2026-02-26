import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAcceptServiceRequest, useDeclineServiceRequest } from "@/hooks/useGig";
import { useContractRealtimeChat } from "@/hooks/useContractRealtimeChat";
import { useServiceRequestRealtimeChat } from "@/hooks/useServiceRequestRealtimeChat";

import { Avatar, FlowScreen, T, useFlowNav, useFlowPalette } from "./shared";

type ChatRow =
  | { type: "date"; key: string; label: string }
  | { type: "message"; key: string; message: any; showAvatar: boolean };

type ThreadScreenProps = {
  threadId?: string;
  title?: string;
  avatar?: string;
  threadKind?: "contract" | "service";
};

function formatDayLabel(dateInput: string): string {
  const date = new Date(dateInput);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msgStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((todayStart - msgStart) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
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

function firstLetter(name: string) {
  const value = name.trim();
  if (!value) return "U";
  return value.charAt(0).toUpperCase();
}

type ViewerRole = "founder" | "freelancer";

function inferViewerRole(pathname: string): ViewerRole {
  if (pathname.includes("/(role-pager)/(freelancer-tabs)/")) return "freelancer";
  if (pathname.includes("/(role-pager)/(founder-tabs)/")) return "founder";
  return "founder";
}

export default function ThreadScreen({ threadId, title, avatar, threadKind = "contract" }: ThreadScreenProps) {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const listRef = useRef<FlatList<ChatRow>>(null);

  const [draft, setDraft] = useState("");

  const contractThread = useContractRealtimeChat({
    contractId: threadKind === "contract" ? threadId : undefined,
    allowAutoResolve: threadKind === "contract",
  });
  const serviceThread = useServiceRequestRealtimeChat({
    requestId: threadKind === "service" ? threadId : undefined,
  });
  const activeThread = threadKind === "service" ? serviceThread : contractThread;
  const resolvedContractId = threadKind === "service" ? serviceThread.requestId : contractThread.contractId;
  const serviceRequestStatus = threadKind === "service" ? serviceThread.requestStatus : null;
  const acceptServiceRequest = useAcceptServiceRequest();
  const declineServiceRequest = useDeclineServiceRequest();
  const {
    isRealtimeConnected,
    currentUserId,
    viewerRole,
    counterpartyProfile,
    messages,
    loading,
    sending,
    error,
    sendTextMessage,
    retryFailedMessage,
  } = activeThread;

  const resolvedViewerRole = viewerRole || inferViewerRole(pathname);
  const peerRoleLabel = resolvedViewerRole === "founder" ? "Freelancer" : "Founder";

  const participantName = counterpartyProfile?.name || title || peerRoleLabel;
  const participantAvatar = counterpartyProfile?.avatar || avatar || null;
  const participantRole = counterpartyProfile?.role || peerRoleLabel;
  const counterpartyId = counterpartyProfile?.id || "";
  const rows = useMemo(() => buildRows(messages || []), [messages]);
  const composerBottom = Platform.OS === "ios" ? Math.max(8, insets.bottom) : 8;
  const androidKeyboardGap = 16;
  const [androidKeyboardOffset, setAndroidKeyboardOffset] = useState(0);
  const isServicePending = threadKind === "service" && serviceRequestStatus === "pending";
  const isServiceActionPending = acceptServiceRequest.isPending || declineServiceRequest.isPending;
  const canSendMessage = !!resolvedContractId && (threadKind !== "service" || serviceRequestStatus === "accepted");

  const requestStatusMeta = useMemo(() => {
    if (threadKind !== "service") return null;
    if (serviceRequestStatus === "accepted") {
      return { label: "Accepted", hint: "You can now chat with each other", color: "#16A34A" };
    }
    if (serviceRequestStatus === "declined") {
      return { label: "Declined", hint: "This request was declined", color: "#DC2626" };
    }
    if (serviceRequestStatus === "cancelled") {
      return { label: "Cancelled", hint: "This request is no longer active", color: "#B45309" };
    }
    return {
      label: "Pending",
      hint:
        resolvedViewerRole === "freelancer"
          ? "Accept or decline this request to continue"
          : "Waiting for freelancer to accept",
      color: "#D97706",
    };
  }, [resolvedViewerRole, serviceRequestStatus, threadKind]);

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 15);
    return () => clearTimeout(timer);
  }, [rows.length]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      const keyboardHeight = event.endCoordinates?.height || 0;
      setAndroidKeyboardOffset(Math.max(0, keyboardHeight - insets.bottom));
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setAndroidKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !canSendMessage) return;
    setDraft("");
    await sendTextMessage(body);
  };

  const handleAcceptServiceRequest = async () => {
    if (threadKind !== "service" || !resolvedContractId) return;
    try {
      await acceptServiceRequest.mutateAsync({ requestId: resolvedContractId });
      await serviceThread.refresh(true);
    } catch (error: any) {
      Alert.alert("Unable to accept", error?.message || "Please try again.");
    }
  };

  const handleDeclineServiceRequest = async () => {
    if (threadKind !== "service" || !resolvedContractId) return;
    try {
      await declineServiceRequest.mutateAsync({ requestId: resolvedContractId });
      await serviceThread.refresh(true);
    } catch (error: any) {
      Alert.alert("Unable to decline", error?.message || "Please try again.");
    }
  };

  const openProfile = () => {
    if (!counterpartyId) return;
    if (resolvedViewerRole === "freelancer") {
      nav.push(`/(role-pager)/(freelancer-tabs)/founder-profile?id=${encodeURIComponent(counterpartyId)}&compact=1`);
      return;
    }
    nav.push(`/freelancer-stack/freelancer-profile?id=${encodeURIComponent(counterpartyId)}`);
  };

  return (
    <FlowScreen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 8,
              borderBottomColor: palette.borderLight,
              backgroundColor: palette.surface,
            },
          ]}
        >
          <TouchableOpacity
            onPress={nav.back}
            style={[styles.iconBtn, { borderColor: palette.borderLight, backgroundColor: palette.bg }]}
          >
            <Ionicons name="arrow-back" size={17} color={palette.text} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={openProfile}
            disabled={!counterpartyId}
            style={styles.headerMain}
          >
            {participantAvatar ? (
              <Avatar source={{ uri: participantAvatar }} size={36} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: palette.accentSoft }]}>
                <T weight="medium" color={palette.accent} style={styles.avatarLetter}>
                  {firstLetter(participantName)}
                </T>
              </View>
            )}

            <View style={{ flex: 1, minWidth: 0 }}>
              <T weight="medium" color={palette.text} style={styles.headerName} numberOfLines={1}>
                {participantName}
              </T>
              <View style={styles.headerMetaRow}>
                <View style={[styles.liveDot, { backgroundColor: isRealtimeConnected ? "#22C55E" : "#F59E0B" }]} />
                <T weight="regular" color={palette.subText} style={styles.headerMeta} numberOfLines={1}>
                  {participantRole} • {isRealtimeConnected ? "Live" : "Connecting..."}
                </T>
              </View>
            </View>
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={[styles.iconBtn, { borderColor: palette.borderLight, backgroundColor: palette.bg }]}
            onPress={openProfile}
            disabled={!counterpartyId}
          >
            <Ionicons
              name="person-circle-outline"
              size={18}
              color={counterpartyId ? palette.text : palette.subText}
            />
          </TouchableOpacity> */}
        </View>

        <View style={[styles.body, { backgroundColor: palette.bg }]}>
          {error ? (
            <View style={[styles.errorPill, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}>
              <T weight="regular" color={palette.accent} style={styles.errorText}>
                {error}
              </T>
            </View>
          ) : null}

          {requestStatusMeta ? (
            <View
              style={[
                styles.requestStatusWrap,
                {
                  borderColor: palette.borderLight,
                  backgroundColor: palette.surface,
                },
              ]}
            >
              <View style={[styles.requestStatusDot, { backgroundColor: requestStatusMeta.color }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.requestStatusTitle}>
                  {requestStatusMeta.label}
                </T>
                <T weight="regular" color={palette.subText} style={styles.requestStatusHint}>
                  {requestStatusMeta.hint}
                </T>
              </View>
            </View>
          ) : null}

          {isServicePending && resolvedViewerRole === "freelancer" ? (
            <View style={styles.requestActionsRow}>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={handleDeclineServiceRequest}
                disabled={isServiceActionPending}
                style={[
                  styles.requestActionBtn,
                  {
                    borderColor: palette.borderLight,
                    backgroundColor: palette.surface,
                    opacity: isServiceActionPending ? 0.6 : 1,
                  },
                ]}
              >
                <T weight="medium" color={palette.subText} style={styles.requestActionText}>
                  Reject
                </T>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={handleAcceptServiceRequest}
                disabled={isServiceActionPending}
                style={[
                  styles.requestActionBtn,
                  {
                    borderColor: palette.accent,
                    backgroundColor: palette.accentSoft,
                    opacity: isServiceActionPending ? 0.6 : 1,
                  },
                ]}
              >
                <T weight="medium" color={palette.accent} style={styles.requestActionText}>
                  Accept
                </T>
              </TouchableOpacity>
            </View>
          ) : null}

          <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            data={rows}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatContent}
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
              const isPending = !!message.pending;
              const isFailed = !!message.failed;

              return (
                <View style={[styles.row, isMine ? styles.rowMine : styles.rowPeer]}>
                  {!isMine ? (
                    showAvatar ? (
                      participantAvatar ? (
                        <Avatar source={{ uri: participantAvatar }} size={24} />
                      ) : (
                        <View style={[styles.peerMiniAvatarFallback, { backgroundColor: palette.accentSoft }]}>
                          <T weight="medium" color={palette.accent} style={styles.peerMiniAvatarLetter}>
                            {firstLetter(participantName)}
                          </T>
                        </View>
                      )
                    ) : (
                      <View style={{ width: 24 }} />
                    )
                  ) : (
                    <View style={{ width: 24 }} />
                  )}

                  <View
                    style={[
                      styles.bubbleWrap,
                      isMine ? styles.bubbleWrapMine : styles.bubbleWrapPeer,
                      isMine && showAvatar ? { marginRight: 4 } : null,
                    ]}
                  >
                    {/* <View
                      style={[
                        styles.roleChip,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.borderLight,
                        },
                      ]}
                    >
                      <T weight="medium" color={palette.text} style={styles.roleChipText}>
                        {roleTag}
                      </T>
                    </View> */}

                    <TouchableOpacity
                      activeOpacity={isFailed ? 0.72 : 1}
                      disabled={!isFailed}
                      onPress={() => retryFailedMessage(message)}
                    >
                      <View
                        style={[
                          styles.bubble,
                          isMine
                            ? { backgroundColor: palette.accent, borderColor: palette.accent }
                            : { backgroundColor: palette.surface, borderColor: palette.borderLight },
                          isMine ? styles.mineBubble : styles.peerBubble,
                          isPending || isFailed ? { opacity: 0.74 } : null,
                        ]}
                      >
                        <T weight="regular" color={isMine ? "#fff" : palette.text} style={styles.bubbleText}>
                          {message.body || "Message"}
                        </T>
                      </View>
                    </TouchableOpacity>

                    <View style={[styles.metaRow, { justifyContent: isMine ? "flex-end" : "flex-start" }]}>
                      {isMine ? (
                        <Ionicons
                          name={isFailed ? "alert-circle-outline" : "checkmark-done"}
                          size={12}
                          color={palette.subText}
                        />
                      ) : null}
                      <T weight="regular" color={palette.subText} style={styles.time}>
                        {timeLabel}
                        {isPending ? " • sending" : ""}
                        {isFailed ? " • failed" : ""}
                      </T>
                    </View>
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

          <View
            style={[
              styles.footerWrap,
              {
                borderTopColor: palette.borderLight,
                backgroundColor: palette.surface,
                paddingBottom: composerBottom,
                marginBottom:
                  Platform.OS === "android" && androidKeyboardOffset > 0
                    ? androidKeyboardOffset + androidKeyboardGap
                    : 0,
              },
            ]}
          >
            <View style={[styles.composer, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
              <TextInput
                placeholder={
                  canSendMessage
                    ? "Type a message"
                    : threadKind === "service"
                      ? "Chat unlocks after request acceptance"
                      : "Type a message"
                }
                placeholderTextColor={palette.subText}
                style={[styles.input, { color: palette.text, backgroundColor: palette.bg }]}
                value={draft}
                onChangeText={setDraft}
                editable={canSendMessage}
                multiline
                maxLength={1200}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: palette.accent,
                    opacity: draft.trim() && !sending && canSendMessage ? 1 : 0.45,
                  },
                ]}
                onPress={handleSend}
                disabled={!draft.trim() || sending || !canSendMessage}
              >
                <Ionicons name="send" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 14,
    lineHeight: 18,
  },
  headerName: {
    fontSize: 13,
    lineHeight: 17,
  },
  headerMetaRow: {
    marginTop: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  headerMeta: {
    fontSize: 10,
    lineHeight: 13,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },

  body: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  errorPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  errorText: { fontSize: 10, lineHeight: 13 },
  requestStatusWrap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requestStatusDot: { width: 8, height: 8, borderRadius: 4 },
  requestStatusTitle: { fontSize: 12, lineHeight: 15 },
  requestStatusHint: { marginTop: 1, fontSize: 10, lineHeight: 13 },
  requestActionsRow: {
    marginBottom: 8,
    flexDirection: "row",
    gap: 8,
  },
  requestActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  requestActionText: { fontSize: 12, lineHeight: 16 },
  chatContent: { paddingBottom: 10 },
  dateWrap: { alignItems: "center", marginVertical: 8 },
  datePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dateText: { fontSize: 10, lineHeight: 13 },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 9,
  },
  rowMine: { justifyContent: "flex-end" },
  rowPeer: { justifyContent: "flex-start" },
  bubbleWrap: { maxWidth: "84%" },
  bubbleWrapMine: { alignItems: "flex-end" },
  bubbleWrapPeer: { alignItems: "flex-start" },
  roleChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  roleChipText: {
    fontSize: 10,
    lineHeight: 13,
  },
  bubble: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  mineBubble: { borderBottomRightRadius: 6 },
  peerBubble: { borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: 12, lineHeight: 17 },
  metaRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  time: { fontSize: 11, lineHeight: 14 },
  peerMiniAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  peerMiniAvatarLetter: {
    fontSize: 10,
    lineHeight: 12,
  },

  footerWrap: {
    borderTopWidth: 1,
    paddingTop: 7,
  },
  composer: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 7,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
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
    minHeight: 35,
    maxHeight: 100,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  emptyWrap: { paddingTop: 36, alignItems: "center" },
  emptyText: { fontSize: 11, lineHeight: 14 },
});
