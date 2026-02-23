import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { io, Socket } from "socket.io-client";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Spacing } from "@/constants/DesignSystem";
import * as tribeApi from "@/lib/tribeApi";
import { supabase } from "@/lib/supabase";
import MessageBubble from "@/components/MessageBubble";
import MembershipGateModal from "@/components/MembershipGateModal";

const TRIBE_API_URL = tribeApi.TRIBE_API_BASE_URL;
const STORAGE_BUCKET = "tribe-media";
const EDIT_WINDOW_MINUTES = 5;
const MESSAGE_CACHE_LIMIT = 300;

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
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState("");
  const [isReadonly, setIsReadonly] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [showMembershipGate, setShowMembershipGate] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<
    Record<string, { display_name?: string; username?: string; avatar_url?: string }>
  >({});
  const [jumpHighlightMessageId, setJumpHighlightMessageId] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [downloadingViewer, setDownloadingViewer] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [editGroupAvatarPath, setEditGroupAvatarPath] = useState("");
  const [editGroupAvatarPreview, setEditGroupAvatarPreview] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const viewerListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingExpiryMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const fetchedProfileIdsRef = useRef<Set<string>>(new Set());
  const sendLockRef = useRef(false);
  const jumpClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getMessageCacheKey = useCallback(() => {
    return `tribe-chat:messages:v1:${userId || "anon"}:${gid || "unknown"}`;
  }, [gid, userId]);

  const normalizeMessageList = useCallback((raw: any[]) => {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((m) => m && typeof m === "object" && m.id)
      .sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime(),
      )
      .slice(-MESSAGE_CACHE_LIMIT);
  }, []);

  const upsertMessage = useCallback((incoming: any) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === incoming.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...incoming };
        return next;
      }
      return [...prev, incoming].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });
  }, []);

  const resolveAvatarUrl = useCallback(async (raw?: string) => {
    const value = (raw || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(value, 60 * 60 * 24 * 30);
    if (error || !data?.signedUrl) return "";
    return `${data.signedUrl}&t=${Date.now()}`;
  }, []);
  const resolveAvatarFromProfileFolder = useCallback(async (uid: string) => {
    if (!uid) return "";
    const folder = `profiles/${uid}`;
    const { data: files, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folder, { limit: 20 });
    if (error || !Array.isArray(files) || files.length === 0) return "";
    const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
    if (!preferred?.name) return "";
    const fullPath = `${folder}/${preferred.name}`;
    return (await resolveAvatarUrl(fullPath)) || "";
  }, [resolveAvatarUrl]);
  const resolveMediaUrl = useCallback(
    async (raw?: string) => {
      const value = (raw || "").trim();
      if (!value) return "";
      if (/^https?:\/\//i.test(value)) return value;
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(value, 60 * 60 * 24 * 30);
      if (error || !data?.signedUrl) return "";
      return `${data.signedUrl}&t=${Date.now()}`;
    },
    [],
  );

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
      setIsSocketConnected(true);
      socket.emit("join_group", { groupId: gid }, (res: any) => {
        if (res?.error) console.warn("[Chat] join_group error:", res.error);
      });
    });

    socket.on("connect_error", (err) => {
      console.error("[Chat] Socket error:", err.message);
      setIsSocketConnected(false);
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    // Listen for new messages from others
    socket.on("message", (data: { groupId: string; message: any }) => {
      if (data.groupId === gid) {
        upsertMessage(data.message);
        if (data.message?.id && data.message?.sender_id !== userId) {
          tribeApi.markAsRead(token, gid, data.message.id).catch(() => {});
        }
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
      (data: { groupId: string; userId: string }) => {
        if (data.groupId !== gid || data.userId === userId) return;
        setTypingUsers((prev) =>
          prev.includes(data.userId) ? prev : [...prev, data.userId],
        );
        const prevTimer = typingExpiryMapRef.current.get(data.userId);
        if (prevTimer) clearTimeout(prevTimer);
        const timer = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
          typingExpiryMapRef.current.delete(data.userId);
        }, 3000);
        typingExpiryMapRef.current.set(data.userId, timer);
      },
    );

    socket.on("user_stop_typing", (data: { groupId: string; userId: string }) => {
      if (data.groupId !== gid || data.userId === userId) return;
      const timer = typingExpiryMapRef.current.get(data.userId);
      if (timer) clearTimeout(timer);
      typingExpiryMapRef.current.delete(data.userId);
      setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
    });

    // Real-time reaction updates
    socket.on(
      "reaction_added",
      (data: { groupId: string; messageId: string; emoji: string; userId: string }) => {
        if (data.userId === userId) return;
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
        if (data.userId === userId) return;
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

    socket.io.on("reconnect", async () => {
      socket.emit("join_group", { groupId: gid }, () => {});
      try {
        const res = await tribeApi.getMessages(token, gid);
        const msgs = (res?.messages ?? []).reverse();
        setMessages(msgs);
      } catch (err) {
        console.warn("[Chat] Reconnect sync failed");
      }
    });

    return () => {
      setIsSocketConnected(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingExpiryMapRef.current.forEach((timer) => clearTimeout(timer));
      typingExpiryMapRef.current.clear();
      socket.emit("leave_group", { groupId: gid });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, gid, userId, upsertMessage]);

  // Hydrate chat instantly from local cache before network fetch.
  useEffect(() => {
    if (!gid || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const cacheKey = getMessageCacheKey();
        const cached = await AsyncStorage.getItem(cacheKey);
        if (!cached) return;
        const parsed = JSON.parse(cached);
        const normalized = normalizeMessageList(parsed);
        if (!cancelled && normalized.length > 0) {
          setMessages(normalized);
          setLoading(false);
        }
      } catch (e) {
        console.warn("[Chat] cache hydrate failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gid, userId, getMessageCacheKey, normalizeMessageList]);

  // Persist recent messages to local storage for offline/instant reopen.
  useEffect(() => {
    if (!gid || !userId) return;
    if (cacheSaveTimerRef.current) clearTimeout(cacheSaveTimerRef.current);
    cacheSaveTimerRef.current = setTimeout(async () => {
      try {
        const cacheKey = getMessageCacheKey();
        const normalized = normalizeMessageList(messages);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(normalized));
      } catch (e) {
        console.warn("[Chat] cache save failed");
      }
    }, 250);
    return () => {
      if (cacheSaveTimerRef.current) {
        clearTimeout(cacheSaveTimerRef.current);
        cacheSaveTimerRef.current = null;
      }
    };
  }, [messages, gid, userId, getMessageCacheKey, normalizeMessageList]);

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
      const ordered = msgs.reverse();
      setMessages(ordered);
      const last = ordered[ordered.length - 1];
      if (last?.id) {
        tribeApi.markAsRead(token, gid, last.id).catch(() => {});
      }
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
        const entries = await Promise.all(
          memberList.map(async (m: any) => {
            if (!m?.user_id) return null;
            const rawAvatar = m?.profiles?.avatar_url || m?.profiles?.photo_url || "";
            const resolvedAvatar =
              (await resolveAvatarUrl(rawAvatar)) ||
              (await resolveAvatarFromProfileFolder(m.user_id));
            return [
              m.user_id,
              {
                display_name: m?.profiles?.display_name,
                username: m?.profiles?.username,
                avatar_url: resolvedAvatar || rawAvatar,
              },
            ] as const;
          }),
        );
        const profileMap: Record<
          string,
          { display_name?: string; username?: string; avatar_url?: string }
        > = {};
        entries.forEach((entry) => {
          if (!entry) return;
          profileMap[entry[0]] = entry[1];
        });
        setMemberProfiles(profileMap);
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
          setGroupDescription(group.description || "");
          setGroupAvatarUrl(group.avatar_url || "");
          setIsReadonly(!!group.is_readonly);
        }
      } catch (e) {
        /* noop */
      }
    })();
  }, [token, gid, tid, userId, resolveAvatarUrl, resolveAvatarFromProfileFolder]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    return () => {
      if (jumpClearTimerRef.current) clearTimeout(jumpClearTimerRef.current);
    };
  }, []);

  // Fallback profile hydration: if tribe-members payload misses photo fields,
  // fetch public profiles for message senders and resolve photo/avatar URLs.
  useEffect(() => {
    if (!token || messages.length === 0) return;
    const senderIds = Array.from(
      new Set(
        messages
          .map((m: any) => m?.sender_id)
          .filter((id: any) => typeof id === "string" && id.length > 0),
      ),
    );
    const missingIds = senderIds.filter((id) => {
      if (fetchedProfileIdsRef.current.has(id)) return false;
      const knownAvatar = memberProfiles[id]?.avatar_url;
      return !knownAvatar;
    });
    if (missingIds.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const uid of missingIds) {
        fetchedProfileIdsRef.current.add(uid);
        try {
          const p = await tribeApi.getPublicProfile(token, uid);
          const rawAvatar =
            (typeof p?.avatar_url === "string" && p.avatar_url) ||
            (typeof p?.photo_url === "string" && p.photo_url) ||
            "";
          const resolvedAvatar =
            (await resolveAvatarUrl(rawAvatar)) ||
            (await resolveAvatarFromProfileFolder(uid));
          if (cancelled) return;
          setMemberProfiles((prev) => ({
            ...prev,
            [uid]: {
              display_name: p?.display_name || prev[uid]?.display_name,
              username: p?.username || prev[uid]?.username,
              avatar_url: resolvedAvatar || rawAvatar || prev[uid]?.avatar_url,
            },
          }));
        } catch {
          // noop: keep fallback initials if profile read fails
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, memberProfiles, resolveAvatarUrl, resolveAvatarFromProfileFolder, token]);

  /* ── Send / Edit / Delete ──────────────────────────────────── */

  const handleSend = async () => {
    if (!text.trim() || !token || !gid || sendLockRef.current) return;
    sendLockRef.current = true;
    const content = text.trim();
    setSending(true);
    try {
      if (editMsg) {
        // Editing existing message
        await tribeApi.editMessage(
          token,
          gid,
          editMsg.id,
          content,
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editMsg.id
              ? { ...m, content, edited_at: new Date().toISOString() }
              : m,
          ),
        );
        setEditMsg(null);
      } else {
        // Sending new message
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const optimistic = {
          id: tempId,
          group_id: gid,
          sender_id: userId,
          content,
          type: "text",
          created_at: new Date().toISOString(),
          pending: true,
          profiles: { id: userId },
          reply_to: replyTo
            ? {
                id: replyTo.id,
                content: replyTo.content,
                sender_id: replyTo.sender_id,
              }
            : null,
          reactions: [],
        };
        upsertMessage(optimistic);

        const msg = await tribeApi.sendMessage(token, gid, {
          content,
          reply_to_id: replyTo?.id,
        });
        setMessages((prev) =>
          {
            const withoutTemp = prev.filter((m) => m.id !== tempId);
            const exists = withoutTemp.some((m) => m.id === msg.id);
            const merged = exists
              ? withoutTemp.map((m) => (m.id === msg.id ? { ...m, ...msg } : m))
              : withoutTemp.concat(msg);
            return merged.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );
          },
        );
        setReplyTo(null);
      }
      setText("");
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socketRef.current?.emit("stop_typing", { groupId: gid });
    } catch (e: any) {
      if (!editMsg) {
        setMessages((prev) =>
          prev.filter((m) => !String(m.id).startsWith("temp-")),
        );
      }
      Alert.alert("Error", e.message);
    } finally {
      setSending(false);
      sendLockRef.current = false;
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
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!token || !gid) return;
    const target = messages.find((m) => m.id === msgId);
    const existing = (target?.reactions || []).find((r: any) => r.emoji === emoji);
    const alreadyReacted = !!existing?.user_reacted;
    try {
      if (alreadyReacted) {
        await tribeApi.removeReaction(token, gid, msgId, emoji);
      } else {
        await tribeApi.addReaction(token, gid, msgId, emoji);
      }
      // Optimistic update (backend socket event also arrives for other users)
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) return m;
          const reactions = [...(m.reactions || [])];
          const idx = reactions.findIndex(
            (r: any) => r.emoji === emoji,
          );
          if (alreadyReacted) {
            if (idx >= 0) {
              reactions[idx] = {
                ...reactions[idx],
                count: Math.max(0, reactions[idx].count - 1),
                user_reacted: false,
              };
            }
          } else if (idx >= 0) {
            reactions[idx] = {
              ...reactions[idx],
              count: reactions[idx].count + 1,
              user_reacted: true,
            };
          } else {
            reactions.push({ emoji, count: 1, user_reacted: true });
          }
          return { ...m, reactions: reactions.filter((r: any) => r.count > 0) };
        }),
      );
    } catch (e: any) {
      console.warn("[Chat] Reaction:", e.message);
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (!gid || !socketRef.current?.connected) return;

    if (value.trim()) {
      socketRef.current.emit("typing", { groupId: gid });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("stop_typing", { groupId: gid });
        typingTimeoutRef.current = null;
      }, 1500);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      socketRef.current.emit("stop_typing", { groupId: gid });
    }
  };

  const startEdit = (msg: any) => {
    const createdAt = new Date(msg?.created_at || 0).getTime();
    const withinWindow =
      Number.isFinite(createdAt) &&
      Date.now() - createdAt <= EDIT_WINDOW_MINUTES * 60 * 1000;
    if (!withinWindow) {
      Alert.alert("Edit unavailable", `Messages can be edited only within ${EDIT_WINDOW_MINUTES} minutes.`);
      return;
    }
    setEditMsg(msg);
    setText(msg.content || "");
    inputRef.current?.focus();
  };

  const cancelEditReply = () => {
    setEditMsg(null);
    setReplyTo(null);
    setText("");
  };

  const uploadChatMedia = useCallback(
    async (
      localUri: string,
      opts: {
        type: "image" | "file";
        fileName?: string;
        mimeType?: string;
      },
    ) => {
      const sourceExt =
        opts.fileName?.split(".").pop()?.toLowerCase() ||
        localUri.split(".").pop()?.toLowerCase() ||
        (opts.type === "image" ? "jpg" : "bin");
      const ext = sourceExt.replace(/[^a-z0-9]/gi, "") || "bin";
      const contentType =
        opts.mimeType ||
        (ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : ext === "pdf"
                ? "application/pdf"
                : "application/octet-stream");
      const fileNameBase =
        opts.fileName?.replace(/\.[^/.]+$/, "") ||
        `${opts.type}-${Date.now()}`;
      const safeName = fileNameBase.replace(/[^a-z0-9-_]/gi, "_").slice(0, 60);
      const filePath = `tribes/${tid || "unknown"}/groups/${gid}/chat/${Date.now()}-${safeName}.${ext}`;

      const response = await fetch(localUri);
      const arrayBuffer = await response.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, arrayBuffer, { contentType, upsert: false });
      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);
      if (signedError || !signedData?.signedUrl) {
        throw signedError || new Error("Failed to create media URL");
      }

      return {
        filePath,
        signedUrl: `${signedData.signedUrl}&t=${Date.now()}`,
        contentType,
      };
    },
    [gid, tid],
  );

  const sendMediaMessage = useCallback(
    async (payload: {
      type: "image" | "file";
      mediaUrl: string;
      filePath: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      width?: number;
      height?: number;
    }) => {
      if (!token || !gid) return;
      const msg = await tribeApi.sendMessage(token, gid, {
        type: payload.type,
        content: payload.type === "file" ? payload.fileName || "Attachment" : "",
        media_url: payload.mediaUrl,
        media_metadata: {
          storage_path: payload.filePath,
          file_name: payload.fileName,
          file_size: payload.fileSize,
          mime_type: payload.mimeType,
          width: payload.width,
          height: payload.height,
        },
      });
      upsertMessage(msg);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 10);
    },
    [token, gid, upsertMessage],
  );

  const pickImageAndSend = useCallback(async () => {
    if (!token || !gid) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.82,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploadingAttachment(true);
    try {
      for (const asset of result.assets) {
        const upload = await uploadChatMedia(asset.uri, {
          type: "image",
          fileName: asset.fileName || undefined,
          mimeType: asset.mimeType || undefined,
        });
        await sendMediaMessage({
          type: "image",
          mediaUrl: upload.signedUrl,
          filePath: upload.filePath,
          fileName: asset.fileName || "image",
          fileSize: asset.fileSize,
          mimeType: upload.contentType,
          width: asset.width,
          height: asset.height,
        });
      }
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Could not send image");
    } finally {
      setUploadingAttachment(false);
    }
  }, [gid, sendMediaMessage, token, uploadChatMedia]);

  const pickFileAndSend = useCallback(async () => {
    if (!token || !gid) return;
    let DocumentPicker: any;
    try {
      DocumentPicker = require("expo-document-picker");
    } catch {
      Alert.alert(
        "Files unavailable",
        "Install expo-document-picker to attach PDF/docs from this screen.",
      );
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];

    setUploadingAttachment(true);
    try {
      const upload = await uploadChatMedia(file.uri, {
        type: "file",
        fileName: file.name,
        mimeType: file.mimeType || undefined,
      });
      await sendMediaMessage({
        type: "file",
        mediaUrl: upload.signedUrl,
        filePath: upload.filePath,
        fileName: file.name || "Attachment",
        fileSize: file.size,
        mimeType: upload.contentType,
      });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Could not send file");
    } finally {
      setUploadingAttachment(false);
    }
  }, [gid, sendMediaMessage, token, uploadChatMedia]);

  const openAttachmentMenu = () => {
    Alert.alert("Add attachment", "Choose what to send", [
      { text: "Image", onPress: pickImageAndSend },
      { text: "File", onPress: pickFileAndSend },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const connectionLabel =
    typingUsers.length > 0
      ? "Someone is typing..."
      : isSocketConnected
        ? "Live"
        : "Reconnecting...";
  const displayGroupName = (groupName || "Chat")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const currentUserName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "You";
  const currentUserAvatarUrl =
    memberProfiles[userId]?.avatar_url ||
    session?.user?.user_metadata?.avatar_url ||
    null;
  const quickEmojis = ["😀", "🔥", "❤️", "🎉", "👍", "🙏", "🚀"];
  const insertEmoji = (emoji: string) => {
    setText((prev) => `${prev}${emoji}`);
    inputRef.current?.focus();
  };
  const chatItems = useMemo(() => {
    const getLocalDayKey = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };
    const formatDatePillLabel = (raw: string) => {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return "";
      const now = new Date();
      const todayKey = getLocalDayKey(now);
      const msgKey = getLocalDayKey(d);
      if (msgKey === todayKey) return "Today";
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (msgKey === getLocalDayKey(yesterday)) return "Yesterday";
      return d.toLocaleDateString("en-GB");
    };
    const messageById = new Map<string, any>();
    messages.forEach((m: any) => {
      if (m?.id) messageById.set(m.id, m);
    });
    const items: Array<any> = [];
    let lastDate = "";
    for (const msg of messages) {
      const dateLabel = formatDatePillLabel(msg.created_at);
      if (dateLabel && dateLabel !== lastDate) {
        items.push({
          kind: "date",
          id: `date-${dateLabel}`,
          label: dateLabel,
        });
        lastDate = dateLabel;
      }
      let normalizedReply = msg.reply_to || null;
      if (!normalizedReply) {
        const replyId =
          msg.reply_to_id ||
          msg.replyToId ||
          msg.reply_message_id ||
          msg.replyMessageId;
        if (replyId && messageById.has(replyId)) {
          const base = messageById.get(replyId);
          normalizedReply = {
            id: base.id,
            content: base.content,
            sender_id: base.sender_id,
            profiles: base.profiles,
          };
        }
      }
      items.push({
        kind: "message",
        id: msg.id || `msg-${Math.random()}`,
        message: {
          ...msg,
          reply_to: normalizedReply,
        },
      });
    }
    return items;
  }, [messages]);
  const jumpToMessage = useCallback(
    (targetId: string) => {
      const index = chatItems.findIndex(
        (item: any) => item.kind === "message" && item.message?.id === targetId,
      );
      if (index < 0) return;
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.35,
      });
      setJumpHighlightMessageId(targetId);
      if (jumpClearTimerRef.current) clearTimeout(jumpClearTimerRef.current);
      jumpClearTimerRef.current = setTimeout(() => {
        setJumpHighlightMessageId(null);
      }, 1800);
    },
    [chatItems],
  );
  const imageMessages = useMemo(
    () => messages.filter((m) => m?.type === "image" && m?.media_url),
    [messages],
  );
  const openImageViewer = useCallback(
    (messageId: string) => {
      const idx = imageMessages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      setViewerIndex(idx);
      setViewerVisible(true);
    },
    [imageMessages],
  );
  useEffect(() => {
    if (!viewerVisible) return;
    const t = setTimeout(() => {
      viewerListRef.current?.scrollToIndex({ index: viewerIndex, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [viewerVisible, viewerIndex]);
  const handleViewerScrollEnd = (event: any) => {
    const width = Dimensions.get("window").width;
    const index = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
    setViewerIndex(index);
  };
  const handleDownloadCurrentImage = async () => {
    const current = imageMessages[viewerIndex];
    const url = current?.media_url;
    if (!url || downloadingViewer) return;
    let FileSystem: any;
    let MediaLibrary: any;
    try {
      FileSystem = require("expo-file-system");
      MediaLibrary = require("expo-media-library");
    } catch {
      Alert.alert(
        "Download unavailable",
        "Install expo-file-system and expo-media-library to save images.",
      );
      return;
    }
    setDownloadingViewer(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Media library permission is required.");
        return;
      }
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
      const localPath = `${baseDir}tribe-image-${Date.now()}.jpg`;
      const downloadRes = await FileSystem.downloadAsync(url, localPath);
      await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
      Alert.alert("Saved", "Image downloaded to your gallery.");
    } catch (e: any) {
      Alert.alert("Download failed", e?.message || "Could not download image");
    } finally {
      setDownloadingViewer(false);
    }
  };
  const openEditGroupModal = async () => {
    if (isReadonly) {
      Alert.alert("Unavailable", "Announcements group cannot be edited.");
      return;
    }
    setEditGroupName(groupName || "");
    setEditGroupDesc(groupDescription || "");
    setEditGroupAvatarPath(groupAvatarUrl || "");
    setEditGroupAvatarPreview(await resolveMediaUrl(groupAvatarUrl || ""));
    setShowEditGroupModal(true);
    try {
      const group = await tribeApi.getGroup(token, tid, gid);
      if (!group) return;
      setEditGroupName(group.name || "");
      setEditGroupDesc(group.description || "");
      setEditGroupAvatarPath(group.avatar_url || "");
      setEditGroupAvatarPreview(await resolveMediaUrl(group.avatar_url || ""));
    } catch {
      // keep current state fallback
    }
  };
  const pickAndUploadGroupAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingGroupAvatar(true);
    try {
      const ext =
        asset.fileName?.split(".").pop()?.toLowerCase() ||
        asset.uri.split(".").pop()?.toLowerCase() ||
        "jpg";
      const normalizedExt = ext.replace(/[^a-z0-9]/gi, "") || "jpg";
      const contentType =
        normalizedExt === "jpg" || normalizedExt === "jpeg"
          ? "image/jpeg"
          : normalizedExt === "png"
            ? "image/png"
            : normalizedExt === "webp"
              ? "image/webp"
              : "application/octet-stream";
      const filePath = `tribes/${tid || "unknown"}/groups/${gid}/avatar.${normalizedExt}`;
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, arrayBuffer, { contentType, upsert: false });
      if (uploadError) throw uploadError;
      const signed = await resolveMediaUrl(filePath);
      setEditGroupAvatarPath(filePath);
      setEditGroupAvatarPreview(signed);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Could not upload group photo");
    } finally {
      setUploadingGroupAvatar(false);
    }
  };
  const saveGroupSettings = async () => {
    if (isReadonly) {
      Alert.alert("Unavailable", "Announcements group cannot be edited.");
      return;
    }
    if (!token || !tid || !gid || !editGroupName.trim()) return;
    setSavingGroup(true);
    try {
      await tribeApi.updateGroup(token, tid, gid, {
        name: editGroupName.trim(),
        description: editGroupDesc.trim() || null,
        avatar_url: editGroupAvatarPath.trim() || null,
      });
      setGroupName(editGroupName.trim());
      setGroupDescription(editGroupDesc.trim());
      setGroupAvatarUrl(editGroupAvatarPath.trim());
      setShowEditGroupModal(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update group");
    } finally {
      setSavingGroup(false);
    }
  };
  const openGroupActions = () => {
    if (!tid || !gid) return;
    const actions: { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }[] = [
      {
        text: "View Tribe",
        onPress: () => router.push(`/tribe/${tid}` as any),
      },
    ];
    if (isGroupAdmin && !isReadonly) {
      actions.push({
        text: "Edit Group",
        onPress: () => {
          openEditGroupModal();
        },
      });
      actions.push({
        text: "Delete Group",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Group",
            `Delete "${displayGroupName}"? This cannot be undone.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await tribeApi.deleteGroup(token, tid, gid);
                    router.replace(`/tribe/${tid}` as any);
                  } catch (e: any) {
                    Alert.alert("Error", e?.message || "Failed to delete group");
                  }
                },
              },
            ],
          );
        },
      });
    }
    actions.push({ text: "Cancel", style: "cancel" });
    Alert.alert(displayGroupName || "Group", "Manage group", actions);
  };

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.headerWrap, { borderBottomColor: theme.border }]}>
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor: theme.background,
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={21} color={theme.text.secondary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.hashLabel, { color: theme.text.tertiary }]}>#</Text>
              <Text
                style={[styles.headerTitle, { color: theme.text.primary }]}
                numberOfLines={1}
              >
                {displayGroupName}
              </Text>
            </View>
            <View style={styles.headerMetaRow}>
              <View
                style={[
                  styles.headerChip,
                  { backgroundColor: `${theme.brand.primary}16` },
                ]}
              >
                <Text style={[styles.headerChipText, { color: theme.brand.primary }]}>
                  {isReadonly ? "Announcements" : "Discussion"}
                </Text>
              </View>
              <Text style={[styles.headerSub, { color: theme.text.tertiary }]}>
                {connectionLabel}
              </Text>
            </View>
          </View>
          {isGroupAdmin && !isReadonly ? (
            <TouchableOpacity onPress={openGroupActions} style={styles.headerIconBtn}>
              <Ionicons name="ellipsis-vertical" size={18} color={theme.text.secondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconPlaceholder} />
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
          data={chatItems}
          renderItem={({ item }) => {
            if (item.kind === "date") {
              return (
                <View style={styles.dateSeparatorWrap}>
                  <View
                    style={[
                      styles.dateSeparatorPill,
                      { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.dateSeparatorText, { color: theme.text.tertiary }]}>
                      {item.label}
                    </Text>
                  </View>
                </View>
              );
            }
            const msg = item.message;
            const fallbackProfile = memberProfiles[msg.sender_id];
            const createdAt = new Date(msg?.created_at || 0).getTime();
            const canEdit =
              Number.isFinite(createdAt) &&
              Date.now() - createdAt <= EDIT_WINDOW_MINUTES * 60 * 1000;
            return (
              <MessageBubble
                message={msg}
                isOwn={msg.sender_id === userId}
                isAdmin={isGroupAdmin}
                canEdit={canEdit}
                onOpenImage={openImageViewer}
                onJumpToMessage={jumpToMessage}
                isJumpHighlighted={msg.id === jumpHighlightMessageId}
                fallbackProfile={fallbackProfile}
                currentUserName={currentUserName}
                currentUserAvatarUrl={currentUserAvatarUrl}
                onReply={() => {
                  setReplyTo(msg);
                  inputRef.current?.focus();
                }}
                onEdit={() => startEdit(msg)}
                onDelete={() => handleDelete(msg.id)}
                onReact={(emoji) => handleReact(msg.id, emoji)}
                showActions={activeActions === msg.id}
                onToggleActions={() =>
                  setActiveActions((prev) => (prev === msg.id ? null : msg.id))
                }
              />
            );
          }}
          keyExtractor={(item, idx) => item.id || `item-${idx}`}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          onScrollToIndexFailed={(info) => {
            const offset = Math.max(0, info.averageItemLength * info.index);
            flatListRef.current?.scrollToOffset({ offset, animated: true });
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.35,
              });
            }, 160);
          }}
          ListEmptyComponent={
            <View style={styles.emptyChatContainer}>
              <View
                style={[
                  styles.emptyIconShell,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={42}
                  color={theme.brand.primary}
                />
              </View>
              <Text
                style={[styles.emptyChatTitle, { color: theme.text.secondary }]}
              >
                No messages yet
              </Text>
              <Text style={[styles.emptyChatText, { color: theme.text.tertiary }]}>
                Be the first to spark the conversation in this channel.
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
            { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
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
              : `Replying to ${replyTo?.profiles?.display_name || replyTo?.profiles?.username || "message"}: ${replyTo.content?.slice(0, 50) || "Media"}`}
          </Text>
          <TouchableOpacity onPress={cancelEditReply}>
            <Ionicons name="close" size={18} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      {(!isReadonly || isGroupAdmin) && (
        <View
          style={[
            styles.inputFooter,
            { backgroundColor: theme.background },
          ]}
        >
            {showEmojiTray ? (
              <View
                style={[
                  styles.emojiTray,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                  },
                ]}
              >
                {quickEmojis.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiBtn}
                    onPress={() => insertEmoji(emoji)}
                  >
                    <Text style={styles.emojiBtnText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <View
              style={[
                styles.inputBar,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.inputIconBtn}
                activeOpacity={0.75}
                onPress={openAttachmentMenu}
                disabled={uploadingAttachment}
              >
                {uploadingAttachment ? (
                  <ActivityIndicator size="small" color={theme.text.tertiary} />
                ) : (
                  <Ionicons name="add" size={20} color={theme.text.tertiary} />
                )}
              </TouchableOpacity>
              <View
                style={[
                  styles.inputFieldWrap,
                  { backgroundColor: theme.background },
                ]}
              >
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: theme.text.primary }]}
                  placeholder="Type a message..."
                  placeholderTextColor={theme.text.muted}
                  value={text}
                  onChangeText={handleTextChange}
                  multiline
                  maxLength={10000}
                  onFocus={() => setActiveActions(null)}
                />
              </View>
              <TouchableOpacity
                style={styles.inputIconBtn}
                activeOpacity={0.75}
                onPress={() => setShowEmojiTray((prev) => !prev)}
              >
                <Ionicons
                  name="happy-outline"
                  size={19}
                  color={theme.text.tertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: text.trim()
                      ? theme.brand.primary
                      : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={handleSend}
                disabled={!text.trim() || sending}
                activeOpacity={0.78}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={theme.text.inverse} />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={16}
                    color={text.trim() ? theme.text.inverse : theme.text.muted}
                  />
                )}
              </TouchableOpacity>
            </View>
        </View>
      )}

      <Modal
        visible={showEditGroupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditGroupModal(false)}
      >
        <View style={styles.groupModalBackdrop}>
          <View
            style={[
              styles.groupModalCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.groupModalHead}>
              <Text style={[styles.groupModalTitle, { color: theme.text.primary }]}>
                Edit Group
              </Text>
              <TouchableOpacity onPress={() => setShowEditGroupModal(false)}>
                <Ionicons name="close" size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.groupAvatarPicker,
                { borderColor: theme.border, backgroundColor: theme.surfaceElevated },
              ]}
              onPress={pickAndUploadGroupAvatar}
              disabled={uploadingGroupAvatar}
              activeOpacity={0.75}
            >
              {editGroupAvatarPreview ? (
                <Image source={{ uri: editGroupAvatarPreview }} style={styles.groupAvatarPreview} />
              ) : (
                <Ionicons name="camera-outline" size={20} color={theme.text.tertiary} />
              )}
              <Text style={[styles.groupAvatarPickerText, { color: theme.text.secondary }]}>
                {uploadingGroupAvatar ? "Uploading..." : "Change group photo"}
              </Text>
            </TouchableOpacity>

            <View style={styles.groupFormBlock}>
              <Text style={[styles.groupFieldLabel, { color: theme.text.tertiary }]}>Group name</Text>
              <TextInput
                style={[
                  styles.groupFieldInput,
                  {
                    color: theme.text.primary,
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                  },
                ]}
                value={editGroupName}
                onChangeText={setEditGroupName}
                placeholder="Enter group name"
                placeholderTextColor={theme.text.muted}
                maxLength={80}
              />
            </View>

            <View style={styles.groupFormBlock}>
              <Text style={[styles.groupFieldLabel, { color: theme.text.tertiary }]}>Description</Text>
              <TextInput
                style={[
                  styles.groupFieldInput,
                  styles.groupFieldInputMultiline,
                  {
                    color: theme.text.primary,
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                  },
                ]}
                value={editGroupDesc}
                onChangeText={setEditGroupDesc}
                placeholder="Add description"
                placeholderTextColor={theme.text.muted}
                multiline
                numberOfLines={3}
                maxLength={240}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.groupSaveBtn,
                {
                  backgroundColor: editGroupName.trim()
                    ? theme.brand.primary
                    : theme.surfaceElevated,
                  opacity: savingGroup ? 0.8 : 1,
                },
              ]}
              disabled={!editGroupName.trim() || savingGroup}
              onPress={saveGroupSettings}
              activeOpacity={0.8}
            >
              {savingGroup ? (
                <ActivityIndicator size="small" color={theme.text.inverse} />
              ) : (
                <Text style={[styles.groupSaveBtnText, { color: theme.text.inverse }]}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.viewerCloseBtn}
            onPress={() => setViewerVisible(false)}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <FlatList
            ref={viewerListRef}
            data={imageMessages}
            keyExtractor={(item, idx) => item.id || `img-${idx}`}
            horizontal
            pagingEnabled
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => {
              const width = Dimensions.get("window").width;
              return { length: width, offset: width * index, index };
            }}
            onMomentumScrollEnd={handleViewerScrollEnd}
            renderItem={({ item }) => (
              <View style={styles.viewerSlide}>
                <Image source={{ uri: item.media_url }} style={styles.viewerImage} resizeMode="contain" />
              </View>
            )}
          />
          <View style={styles.viewerFooter}>
            <Text style={styles.viewerCountText}>
              {imageMessages.length ? `${viewerIndex + 1}/${imageMessages.length}` : "0/0"}
            </Text>
            <TouchableOpacity
              style={styles.viewerDownloadBtn}
              onPress={handleDownloadCurrentImage}
              disabled={downloadingViewer}
            >
              {downloadingViewer ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.viewerDownloadText}>Download</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Membership Gate Dialog ──────────────────────── */}
      <MembershipGateModal
        visible={showMembershipGate}
        onClose={() => {
          setShowMembershipGate(false);
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

/* ================================================================ */
/*  Styles                                                          */
/* ================================================================ */

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: {
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconPlaceholder: {
    width: 36,
    height: 36,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingVertical: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 20,
  },
  hashLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Poppins_400Regular",
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    fontFamily: "Poppins_500Medium",
  },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 4,
  },
  headerChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  headerChipText: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.6,
    fontFamily: "Poppins_500Medium",
    textTransform: "uppercase",
  },
  headerSub: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0,
    fontFamily: "Poppins_400Regular",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  msgList: {
    paddingTop: 10,
    paddingBottom: 12,
  },
  dateSeparatorWrap: {
    alignItems: "center",
    marginVertical: 6,
  },
  dateSeparatorPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dateSeparatorText: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.1,
    fontFamily: "Poppins_500Medium",
  },
  emptyChatContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 96,
    paddingHorizontal: Spacing.xxl,
  },
  emptyIconShell: {
    width: 104,
    height: 104,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChatTitle: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
    marginTop: Spacing.md,
  },
  emptyChatText: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: 14,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontFamily: "Poppins_400Regular",
  },
  inputFooter: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === "ios" ? Spacing.lg : Spacing.sm,
  },
  emojiTray: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: Spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emojiBtn: {
    width: 36,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBtnText: {
    fontSize: 22,
    lineHeight: 24,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  inputIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  inputFieldWrap: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  input: {
    minHeight: 40,
    maxHeight: 120,
    paddingVertical: Spacing.xs,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
    fontFamily: "Poppins_400Regular",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  groupModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  groupModalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  groupModalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  groupModalTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium",
    letterSpacing: -0.2,
  },
  groupAvatarPicker: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 68,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  groupAvatarPreview: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  groupAvatarPickerText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
  groupFormBlock: {
    marginTop: Spacing.md,
    gap: 6,
  },
  groupFieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
    letterSpacing: 0,
  },
  groupFieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },
  groupFieldInputMultiline: {
    minHeight: 84,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  groupSaveBtn: {
    marginTop: Spacing.lg,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  groupSaveBtnText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Poppins_500Medium",
    letterSpacing: -0.1,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 26,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  viewerSlide: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.74,
  },
  viewerFooter: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 36 : 18,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewerCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  viewerDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  viewerDownloadText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },
});
