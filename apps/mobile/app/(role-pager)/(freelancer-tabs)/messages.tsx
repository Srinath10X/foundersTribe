import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar, FlowScreen, T, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import { useContracts, useServiceRequests } from "@/hooks/useGig";
import contractApi from "@/lib/gigService";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import type { Contract, ContractMessage, MessageType, ServiceMessageRequest } from "@/types/gig";

type ChatFilter = "all" | "unread" | "read";
const STORAGE_BUCKET = "tribe-media";
const MAX_REALTIME_FILTER_CONTRACTS = 80;
const PUSH_BANNER_VISIBLE_MS = 4200;

const chatFilters: { key: ChatFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];

type ContractChatMeta = {
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
};
const chatMetaCacheByContractId = new Map<string, ContractChatMeta>();

function getMetaCacheKey(ownerId: string | null | undefined, contractId: string) {
  return `${ownerId || "anon"}::${contractId}`;
}

type PushBannerState = {
  contractId: string;
  senderName: string;
  preview: string;
};

type PublicProfileLite = {
  display_name?: string | null;
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
  user_type?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
};

function formatChatTime(input?: string | null) {
  if (!input) return "";
  const date = new Date(input);
  const now = new Date();
  if (Number.isNaN(date.getTime())) return "";

  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function normalizeMessageBody(body: string | null, type: MessageType) {
  if (body && body.trim().length > 0) return body.trim();
  if (type === "file") return "Shared a file";
  if (type === "system") return "System update";
  return "No messages yet";
}

function getLastActivityTs(meta: ContractChatMeta | undefined, contract: Contract) {
  const raw = meta?.lastMessageAt || contract.updated_at || contract.created_at;
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function firstLetter(name: string) {
  const value = name.trim();
  if (!value) return "F";
  return value.charAt(0).toUpperCase();
}

async function resolveAvatar(candidate: unknown, userId: string): Promise<string | null> {
  if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (typeof candidate === "string" && candidate.trim()) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
    if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
  }

  if (!userId) return null;
  const folder = `profiles/${userId}`;
  const { data: files } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 20 });
  if (!Array.isArray(files) || files.length === 0) return null;
  const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
  if (!preferred?.name) return null;

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
  return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
}

function roleLabel(contract: Contract) {
  const explicitRole = contract.founder?.role;
  if (explicitRole && explicitRole.trim().length > 0) {
    const role = explicitRole.trim();
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
  return "Founder";
}

export default function FreelancerMessagesScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { session } = useAuth();
  const currentUserId = session?.user?.id || "";
  const keyboardVerticalOffset = Platform.OS === "ios" ? 88 : 0;

  const { data, isLoading, error, isRefetching, refetch } = useContracts({ limit: 200 });
  const {
    data: serviceRequestsData,
    isLoading: serviceRequestsLoading,
    refetch: refetchServiceRequests,
  } = useServiceRequests(
    { limit: 100 },
    true,
    session?.user?.id || currentUserId || "session",
  );
  const contracts = useMemo(() => {
    const all = data?.items ?? [];
    if (!currentUserId) return all;
    return all.filter((contract) => contract?.freelancer_id === currentUserId);
  }, [currentUserId, data?.items]);
  const serviceRequests = useMemo(() => {
    const all = serviceRequestsData?.items ?? [];
    if (!currentUserId) return all;
    return all.filter((request) => request.founder_id === currentUserId || request.freelancer_id === currentUserId);
  }, [currentUserId, serviceRequestsData?.items]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChatFilter>("all");
  const [chatMetaByContractId, setChatMetaByContractId] = useState<Record<string, ContractChatMeta>>({});
  const [publicProfilesByUserId, setPublicProfilesByUserId] = useState<Record<string, PublicProfileLite>>({});
  const [metaLoading, setMetaLoading] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [pushBanner, setPushBanner] = useState<PushBannerState | null>(null);
  const pushBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serviceRequestsRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPushBanner = useCallback((nextBanner: PushBannerState) => {
    setPushBanner(nextBanner);
    if (pushBannerTimerRef.current) clearTimeout(pushBannerTimerRef.current);
    pushBannerTimerRef.current = setTimeout(() => setPushBanner(null), PUSH_BANNER_VISIBLE_MS);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pushBannerTimerRef.current) clearTimeout(pushBannerTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (serviceRequestsRefetchTimerRef.current) clearTimeout(serviceRequestsRefetchTimerRef.current);
    };
  }, []);

  const scheduleServiceRequestsRefetch = useCallback(() => {
    if (serviceRequestsRefetchTimerRef.current) return;
    serviceRequestsRefetchTimerRef.current = setTimeout(() => {
      serviceRequestsRefetchTimerRef.current = null;
      refetchServiceRequests().catch(() => undefined);
    }, 900);
  }, [refetchServiceRequests]);

  useEffect(() => {
    if (!currentUserId) return;
    refetchServiceRequests().catch(() => undefined);
  }, [currentUserId, refetchServiceRequests]);

  useEffect(() => {
    if (!currentUserId) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refetchServiceRequests().catch(() => undefined);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [currentUserId, refetchServiceRequests]);

  useEffect(() => {
    const userId = currentUserId;
    if (!userId || contracts.length === 0) {
      setChatMetaByContractId({});
      setMetaLoading(false);
      return;
    }

    const cachedSeed: Record<string, ContractChatMeta> = {};
    contracts.forEach((contract) => {
      const cacheKey = getMetaCacheKey(userId, contract.id);
      const cached = chatMetaCacheByContractId.get(cacheKey);
      if (cached) {
        cachedSeed[contract.id] = cached;
      }
    });
    setChatMetaByContractId((prev) => ({ ...cachedSeed, ...prev }));

    const contractsMissingMeta = contracts.filter((contract) => {
      const cacheKey = getMetaCacheKey(userId, contract.id);
      return !chatMetaCacheByContractId.has(cacheKey);
    });
    if (contractsMissingMeta.length === 0) {
      setMetaLoading(false);
      return;
    }

    let cancelled = false;
    setMetaLoading(true);

    (async () => {
      const entries = await Promise.all(
        contractsMissingMeta.map(async (contract) => {
          try {
            const res = await contractApi.getContractMessages(contract.id, { limit: 20 });
            const ordered = [...(res.items || [])].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            );

            const last = ordered[0];
            const unreadCount = ordered.filter(
              (message) => !message.read_at && message.sender_id !== userId,
            ).length;

            return [
              contract.id,
              {
                lastMessage: last ? normalizeMessageBody(last.body, last.message_type) : "No messages",
                lastMessageAt: last?.created_at || contract.updated_at || contract.created_at,
                unreadCount,
              } as ContractChatMeta,
            ] as const;
          } catch {
            return [
              contract.id,
              {
                lastMessage: "No messages",
                lastMessageAt: contract.updated_at || contract.created_at,
                unreadCount: 0,
              } as ContractChatMeta,
            ] as const;
          }
        }),
      );

      if (cancelled) return;
      const merged = Object.fromEntries(entries);
      Object.entries(merged).forEach(([contractId, meta]) => {
        const cacheKey = getMetaCacheKey(userId, contractId);
        chatMetaCacheByContractId.set(cacheKey, meta as ContractChatMeta);
      });
      setChatMetaByContractId((prev) => ({ ...prev, ...merged }));
      setMetaLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [contracts, currentUserId]);

  useEffect(() => {
    const userId = currentUserId;
    if (!userId || contracts.length === 0) {
      setIsRealtimeConnected(false);
      return;
    }

    const contractIds = contracts.map((contract) => contract.id).filter(Boolean);
    const contractIdSet = new Set(contractIds);
    const baseConfig = {
      schema: "public" as const,
      table: "messages" as const,
    };
    const filter =
      contractIds.length > 0 && contractIds.length <= MAX_REALTIME_FILTER_CONTRACTS
        ? `contract_id=in.(${contractIds.join(",")})`
        : undefined;

    const channel = supabase.channel(`freelancer-chat-realtime:${userId}:${Date.now()}`);

    channel.on(
      "postgres_changes",
      filter ? { ...baseConfig, event: "INSERT", filter } : { ...baseConfig, event: "INSERT" },
      (payload) => {
        const incoming = payload.new as ContractMessage;
        if (!incoming?.contract_id || !contractIdSet.has(incoming.contract_id)) return;

        const isIncomingMessage = incoming.sender_id !== userId;
        const nextPreview = normalizeMessageBody(incoming.body, incoming.message_type);
        setChatMetaByContractId((prev) => {
          const previous = prev[incoming.contract_id] || {
            lastMessage: "No messages",
            lastMessageAt: null,
            unreadCount: 0,
          };
          const nextMeta: ContractChatMeta = {
            lastMessage: nextPreview,
            lastMessageAt: incoming.created_at || previous.lastMessageAt,
            unreadCount: isIncomingMessage ? previous.unreadCount + 1 : previous.unreadCount,
          };
          const cacheKey = getMetaCacheKey(userId, incoming.contract_id);
          chatMetaCacheByContractId.set(cacheKey, nextMeta);
          return {
            ...prev,
            [incoming.contract_id]: nextMeta,
          };
        });

        if (isIncomingMessage && AppState.currentState === "active") {
          const linkedContract = contracts.find((contract) => contract.id === incoming.contract_id);
          const remoteProfile = linkedContract ? publicProfilesByUserId[linkedContract.founder_id] : null;
          const senderName =
            remoteProfile?.display_name ||
            remoteProfile?.full_name ||
            remoteProfile?.username ||
            linkedContract?.founder?.full_name ||
            "Founder";

          showPushBanner({
            contractId: incoming.contract_id,
            senderName,
            preview: nextPreview,
          });
        }
      },
    );

    channel.on(
      "postgres_changes",
      filter ? { ...baseConfig, event: "UPDATE", filter } : { ...baseConfig, event: "UPDATE" },
      (payload) => {
        const next = payload.new as ContractMessage;
        if (!next?.contract_id || !contractIdSet.has(next.contract_id)) return;
        if (next.recipient_id !== userId || !next.read_at) return;
        const oldReadAt = (payload.old as Partial<ContractMessage> | null | undefined)?.read_at;
        if (oldReadAt) return;

        setChatMetaByContractId((prev) => {
          const existing = prev[next.contract_id];
          if (!existing) return prev;
          const nextMeta: ContractChatMeta = {
            ...existing,
            unreadCount: Math.max(0, existing.unreadCount - 1),
          };
          const cacheKey = getMetaCacheKey(userId, next.contract_id);
          chatMetaCacheByContractId.set(cacheKey, nextMeta);
          return {
            ...prev,
            [next.contract_id]: nextMeta,
          };
        });
      },
    );

    channel.subscribe((status) => {
      setIsRealtimeConnected(status === "SUBSCRIBED");
    });

    return () => {
      setIsRealtimeConnected(false);
      supabase.removeChannel(channel);
    };
  }, [contracts, currentUserId, publicProfilesByUserId, showPushBanner]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || (contracts.length === 0 && serviceRequests.length === 0)) return;

    const candidateIds = [
      ...contracts.map((contract) => contract.founder_id),
      ...serviceRequests.map((request) =>
        request.founder_id === currentUserId ? request.freelancer_id : request.founder_id,
      ),
    ];
    const profileIds = Array.from(
      new Set(candidateIds.filter((id) => Boolean(id) && !publicProfilesByUserId[id])),
    );
    if (profileIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        profileIds.map(async (userId) => {
          try {
            const raw = await tribeApi.getPublicProfile(token, userId);
            const avatar = await resolveAvatar(raw?.photo_url || raw?.avatar_url || null, userId);
            return [
              userId,
              {
                ...raw,
                avatar_url: avatar || raw?.avatar_url || null,
                photo_url: avatar || raw?.photo_url || null,
              } as PublicProfileLite,
            ] as const;
          } catch {
            return [userId, null] as const;
          }
        }),
      );

      if (cancelled) return;
      setPublicProfilesByUserId((prev) => {
        const next = { ...prev };
        entries.forEach(([userId, profile]) => {
          if (profile) next[userId] = profile;
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [contracts, currentUserId, publicProfilesByUserId, serviceRequests, session?.access_token]);

  useEffect(() => {
    const userId = currentUserId;
    if (!userId) return;

    const requestConfig = {
      schema: "public" as const,
      table: "service_message_requests" as const,
    };
    const messageConfig = {
      schema: "public" as const,
      table: "service_request_messages" as const,
    };

    const channel = supabase.channel(`freelancer-service-requests-realtime:${userId}:${Date.now()}`);

    channel.on("postgres_changes", { ...requestConfig, event: "INSERT", filter: `founder_id=eq.${userId}` }, () => {
      scheduleServiceRequestsRefetch();
    });
    channel.on("postgres_changes", { ...requestConfig, event: "UPDATE", filter: `founder_id=eq.${userId}` }, () => {
      scheduleServiceRequestsRefetch();
    });
    channel.on("postgres_changes", { ...requestConfig, event: "INSERT", filter: `freelancer_id=eq.${userId}` }, () => {
      scheduleServiceRequestsRefetch();
    });
    channel.on("postgres_changes", { ...requestConfig, event: "UPDATE", filter: `freelancer_id=eq.${userId}` }, () => {
      scheduleServiceRequestsRefetch();
    });
    channel.on("postgres_changes", { ...messageConfig, event: "INSERT", filter: `recipient_id=eq.${userId}` }, () => {
      scheduleServiceRequestsRefetch();
    });
    channel.on("postgres_changes", { ...messageConfig, event: "INSERT", filter: `sender_id=eq.${userId}` }, () => {
      scheduleServiceRequestsRefetch();
    });
    channel.on("postgres_changes", { ...messageConfig, event: "UPDATE", filter: `recipient_id=eq.${userId}` }, () => {
      scheduleServiceRequestsRefetch();
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, scheduleServiceRequestsRefetch]);

  const statusCounts = useMemo(() => {
    const contractUnread = contracts.filter((contract) => (chatMetaByContractId[contract.id]?.unreadCount || 0) > 0).length;
    const contractRead = contracts.filter((contract) => (chatMetaByContractId[contract.id]?.unreadCount || 0) === 0).length;
    const requestUnread = serviceRequests.filter((request) => (request.unread_count || 0) > 0).length;
    const requestRead = serviceRequests.filter((request) => (request.unread_count || 0) === 0).length;
    return {
      all: contracts.length + serviceRequests.length,
      unread: contractUnread + requestUnread,
      read: contractRead + requestRead,
    };
  }, [chatMetaByContractId, contracts, serviceRequests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const byFilter = contracts.filter((contract) => {
      const unreadCount = chatMetaByContractId[contract.id]?.unreadCount || 0;
      if (statusFilter === "unread") return unreadCount > 0;
      if (statusFilter === "read") return unreadCount === 0;
      return true;
    });

    const bySearch = byFilter.filter((contract) => {
      if (!q) return true;
      const profile = publicProfilesByUserId[contract.founder_id];
      const person =
        profile?.display_name ||
        profile?.full_name ||
        profile?.username ||
        contract.founder?.full_name ||
        "founder";
      const title = contract.gig?.title || "contract";
      const role = profile?.role || profile?.user_type || roleLabel(contract);
      const lastMessage = chatMetaByContractId[contract.id]?.lastMessage || "";
      return (
        person.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q) ||
        lastMessage.toLowerCase().includes(q)
      );
    });

    return [...bySearch].sort((a, b) => {
      const aTs = getLastActivityTs(chatMetaByContractId[a.id], a);
      const bTs = getLastActivityTs(chatMetaByContractId[b.id], b);
      if (aTs !== bTs) return bTs - aTs;

      const unreadA = chatMetaByContractId[a.id]?.unreadCount || 0;
      const unreadB = chatMetaByContractId[b.id]?.unreadCount || 0;
      if (unreadA !== unreadB) return unreadB - unreadA;
      return 0;
    });
  }, [chatMetaByContractId, contracts, publicProfilesByUserId, query, statusFilter]);

  const filteredServiceRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...serviceRequests].sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    );

    return sorted.filter((request) => {
      const unreadCount = request.unread_count || 0;
      if (statusFilter === "unread" && unreadCount === 0) return false;
      if (statusFilter === "read" && unreadCount > 0) return false;

      if (!q) return true;
      const otherUserId =
        request.founder_id === currentUserId ? request.freelancer_id : request.founder_id;
      const profile = publicProfilesByUserId[otherUserId];
      const person = profile?.display_name || profile?.full_name || profile?.username || "member";
      const serviceName = request.service?.service_name || "service";
      const preview = request.last_message_preview || request.request_message || "";

      return (
        person.toLowerCase().includes(q) ||
        serviceName.toLowerCase().includes(q) ||
        preview.toLowerCase().includes(q)
      );
    });
  }, [currentUserId, publicProfilesByUserId, query, serviceRequests, statusFilter]);

  const getServiceCounterparty = useCallback((request: ServiceMessageRequest) => {
    const otherUserId =
      request.founder_id === currentUserId ? request.freelancer_id : request.founder_id;
    const remoteProfile = publicProfilesByUserId[otherUserId];
    return {
      id: otherUserId,
      name:
        remoteProfile?.display_name ||
        remoteProfile?.full_name ||
        remoteProfile?.username ||
        "Founder",
      avatar: remoteProfile?.photo_url || remoteProfile?.avatar_url || undefined,
      role:
        remoteProfile?.role ||
        remoteProfile?.user_type ||
        (request.founder_id === currentUserId ? "Freelancer" : "Founder"),
    };
  }, [currentUserId, publicProfilesByUserId]);

  const getFounderParty = useCallback((contract: Contract) => {
    const remoteProfile = publicProfilesByUserId[contract.founder_id];
    const founder = contract.founder;
    return {
      name:
        remoteProfile?.display_name ||
        remoteProfile?.full_name ||
        remoteProfile?.username ||
        founder?.full_name ||
        "Founder",
      avatar:
        remoteProfile?.photo_url ||
        remoteProfile?.avatar_url ||
        founder?.avatar_url ||
        undefined,
      role:
        remoteProfile?.role ||
        remoteProfile?.user_type ||
        roleLabel(contract),
    };
  }, [publicProfilesByUserId]);

  const contractsById = useMemo(() => {
    const map: Record<string, Contract> = {};
    contracts.forEach((contract) => {
      map[contract.id] = contract;
    });
    return map;
  }, [contracts]);

  const openThread = useCallback(
    (contractId: string, fallbackName?: string, fallbackAvatar?: string) => {
      const linked = contractsById[contractId];
      const party = linked ? getFounderParty(linked) : null;
      const title = party?.name || fallbackName || "Founder";
      const avatar = party?.avatar || fallbackAvatar || "";
      setPushBanner(null);
      router.push(
        `/(role-pager)/(freelancer-tabs)/thread/${encodeURIComponent(contractId)}?title=${encodeURIComponent(title)}&avatar=${encodeURIComponent(avatar)}`,
      );
    },
    [contractsById, getFounderParty, router],
  );

  const openServiceThread = useCallback(
    (requestId: string, fallbackName?: string, fallbackAvatar?: string) => {
      const title = fallbackName || "Service Chat";
      const avatar = fallbackAvatar || "";
      setPushBanner(null);
      router.push(
        `/(role-pager)/(freelancer-tabs)/thread/${encodeURIComponent(
          requestId,
        )}?threadKind=service&title=${encodeURIComponent(title)}&avatar=${encodeURIComponent(avatar)}`,
      );
    },
    [router],
  );

  return (
    <FlowScreen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>
            Messages
          </T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
            Your recent conversations
          </T>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: isRealtimeConnected ? "#22C55E" : "#F59E0B" }]} />
            <T weight="regular" color={palette.subText} style={styles.liveText}>
              {isRealtimeConnected ? "Live updates on" : "Reconnecting..."}
            </T>
          </View>
        </View>

        {pushBanner ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openThread(pushBanner.contractId, pushBanner.senderName)}
            style={[
              styles.pushBanner,
              {
                borderColor: palette.borderLight,
                backgroundColor: palette.surface,
              },
            ]}
          >
            <View style={[styles.pushDot, { backgroundColor: palette.accent }]} />
            <View style={styles.pushContent}>
              <T weight="medium" color={palette.text} style={styles.pushTitle} numberOfLines={1}>
                {pushBanner.senderName}
              </T>
              <T weight="regular" color={palette.subText} style={styles.pushPreview} numberOfLines={1}>
                {pushBanner.preview}
              </T>
            </View>
            <Ionicons name="chevron-forward" size={14} color={palette.subText} />
          </TouchableOpacity>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || serviceRequestsLoading}
              onRefresh={() => {
                refetch();
                refetchServiceRequests();
              }}
              tintColor={palette.accent}
            />
          }
          ListHeaderComponent={
            <View style={styles.controlsWrap}>
              <View style={[styles.search, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}>
                <Ionicons name="search" size={15} color={palette.subText} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search messages"
                  placeholderTextColor={palette.subText}
                  style={[styles.searchInput, { color: palette.text }]}
                />
                {query.length > 0 ? (
                  <TouchableOpacity onPress={() => setQuery("")}>
                    <Ionicons name="close-circle" size={16} color={palette.subText} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                {chatFilters.map((item) => {
                  const active = statusFilter === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      activeOpacity={0.86}
                      onPress={() => setStatusFilter(item.key)}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? palette.accentSoft : palette.surface,
                          borderColor: active ? palette.accent : palette.borderLight,
                        },
                      ]}
                    >
                      <T weight="regular" color={active ? palette.accent : palette.subText} style={styles.filterText}>
                        {item.label} ({statusCounts[item.key]})
                      </T>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {metaLoading ? (
                <View style={styles.metaLoadingRow}>
                  <ActivityIndicator size="small" color={palette.accent} />
                  <T weight="regular" color={palette.subText} style={styles.metaLoadingText}>
                    Updating unread counts...
                  </T>
                </View>
              ) : null}

              {serviceRequestsLoading ? (
                <View style={styles.metaLoadingRow}>
                  <ActivityIndicator size="small" color={palette.accent} />
                  <T weight="regular" color={palette.subText} style={styles.metaLoadingText}>
                    Loading service requests...
                  </T>
                </View>
              ) : null}

              {isLoading ? (
                <View style={styles.metaLoadingRow}>
                  <ActivityIndicator size="small" color={palette.accent} />
                  <T weight="regular" color={palette.subText} style={styles.metaLoadingText}>
                    Loading conversations...
                  </T>
                </View>
              ) : null}

              {error ? (
                <T weight="regular" color={palette.accent} style={styles.metaLoadingText}>
                  {error.message}
                </T>
              ) : null}

              {filteredServiceRequests.length > 0 ? (
                <View style={styles.serviceRequestSection}>
                  <View style={styles.sectionHeadRow}>
                    <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                      Service Requests
                    </T>
                  </View>
                  <View style={styles.sectionStack}>
                    {filteredServiceRequests.map((request) => {
                      const party = getServiceCounterparty(request);
                      const unreadCount = request.unread_count || 0;
                      const preview =
                        request.last_message_preview ||
                        request.request_message ||
                        `Discussing ${request.service?.service_name || "service"}`;
                      const lastTime = formatChatTime(request.last_message_at);

                      return (
                        <TouchableOpacity
                          key={request.id}
                          style={styles.rowPressable}
                          activeOpacity={0.88}
                          onPress={() => openServiceThread(request.id, party.name, party.avatar)}
                        >
                          <View style={styles.row}>
                            {party.avatar ? (
                              <Avatar source={{ uri: party.avatar }} size={44} />
                            ) : (
                              <View style={[styles.avatarFallback, { backgroundColor: palette.accentSoft }]}>
                                <T weight="medium" color={palette.accent} style={styles.avatarLetter}>
                                  {firstLetter(party.name)}
                                </T>
                              </View>
                            )}
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={styles.topLine}>
                                <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>
                                  {party.name}
                                </T>
                                <T weight="regular" color={unreadCount > 0 ? palette.accent : palette.subText} style={styles.time}>
                                  {lastTime}
                                </T>
                              </View>
                              <T weight="regular" color={palette.subText} style={styles.roleText} numberOfLines={1}>
                                {request.service?.service_name || party.role}
                              </T>
                              <View style={styles.bottomLine}>
                                <T
                                  weight="regular"
                                  color={unreadCount > 0 ? palette.text : palette.subText}
                                  style={styles.message}
                                  numberOfLines={1}
                                >
                                  {preview}
                                </T>
                                {unreadCount > 0 ? (
                                  <View style={[styles.badge, { backgroundColor: palette.accent }]}>
                                    <T weight="medium" color="#fff" style={styles.badgeTxt}>
                                      {unreadCount > 99 ? "99+" : String(unreadCount)}
                                    </T>
                                  </View>
                                ) : (
                                  <Ionicons name="checkmark-done" size={15} color="#94A3B8" />
                                )}
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            filteredServiceRequests.length > 0 ? null : (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubble-ellipses-outline" size={30} color={palette.subText} />
                <T weight="medium" color={palette.text} style={styles.emptyTitle}>
                  No messages found
                </T>
                <T weight="regular" color={palette.subText} style={styles.emptySub}>
                  Try another search term or filter.
                </T>
              </View>
            )
          }
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: palette.borderLight }]} />}
          renderItem={({ item: contract }) => {
            const party = getFounderParty(contract);
            const meta = chatMetaByContractId[contract.id];
            const unreadCount = meta?.unreadCount || 0;
            const lastMessage = meta?.lastMessage || `No messages yet • ${contract.gig?.title || "Contract"}`;
            const lastTime = formatChatTime(meta?.lastMessageAt || contract.updated_at || contract.created_at);

            return (
              <TouchableOpacity
                style={styles.rowPressable}
                activeOpacity={0.88}
                onPress={() => openThread(contract.id, party.name, party.avatar)}
              >
                <View style={styles.row}>
                  {party.avatar ? (
                    <Avatar source={{ uri: party.avatar }} size={44} />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: palette.accentSoft }]}>
                      <T weight="medium" color={palette.accent} style={styles.avatarLetter}>
                        {firstLetter(party.name)}
                      </T>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.topLine}>
                      <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>
                        {party.name}
                      </T>
                      <T weight="regular" color={unreadCount > 0 ? palette.accent : palette.subText} style={styles.time}>
                        {lastTime}
                      </T>
                    </View>
                    <T weight="regular" color={palette.subText} style={styles.roleText} numberOfLines={1}>
                      {party.role}
                    </T>
                    <View style={styles.bottomLine}>
                      <T weight="regular" color={unreadCount > 0 ? palette.text : palette.subText} style={styles.message} numberOfLines={1}>
                        {lastMessage}
                      </T>
                      {unreadCount > 0 ? (
                        <View style={[styles.badge, { backgroundColor: palette.accent }]}>
                          <T weight="medium" color="#fff" style={styles.badgeTxt}>
                            {unreadCount > 99 ? "99+" : String(unreadCount)}
                          </T>
                        </View>
                      ) : (
                        <Ionicons name="checkmark-done" size={15} color="#94A3B8" />
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
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
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  liveRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10,
    lineHeight: 13,
  },
  pushBanner: {
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 2,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pushDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  pushContent: {
    flex: 1,
    minWidth: 0,
  },
  pushTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  pushPreview: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
  },
  controlsWrap: {
    gap: 8,
    marginBottom: 8,
  },
  serviceRequestSection: {
    marginTop: 2,
    gap: 8,
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  sectionStack: {
    gap: 8,
  },
  search: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  filtersScroll: {
    gap: 7,
    paddingRight: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterText: {
    fontSize: 11,
    lineHeight: 14,
  },
  metaLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaLoadingText: {
    fontSize: 11,
    lineHeight: 14,
  },
  rowPressable: {
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 17,
    lineHeight: 21,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  bottomLine: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  roleText: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  time: {
    fontSize: 10,
    lineHeight: 13,
  },
  message: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt: {
    fontSize: 10,
    lineHeight: 12,
  },
  separator: {
    height: 1,
    marginLeft: 54,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 22,
    alignItems: "center",
    marginTop: 4,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
  },
  emptySub: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
  },
});
