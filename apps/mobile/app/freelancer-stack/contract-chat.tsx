import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Avatar,
  FlowScreen,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useContracts } from "@/hooks/useGig";
import contractApi from "@/lib/gigService";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import type { Contract, ContractMessage, MessageType } from "@/types/gig";

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
  bio?: string | null;
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
  const explicitRole = contract.freelancer?.role;
  if (explicitRole && explicitRole.trim().length > 0) {
    const role = explicitRole.trim();
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  const bio = contract.freelancer?.bio?.trim();
  if (bio) return bio.length > 38 ? `${bio.slice(0, 38)}...` : bio;

  return "Freelancer";
}

export default function ContractChatScreen() {
  const { palette } = useFlowPalette();
  const insets = useSafeAreaInsets();
  const nav = useFlowNav();
  const pathname = usePathname();
  const { session } = useAuth();
  const currentUserId = session?.user?.id || "";

  const { data, isLoading, error, refetch, isRefetching } = useContracts({ limit: 200 });
  const contracts = useMemo(() => {
    const all = data?.items ?? [];
    if (!currentUserId) return all;
    return all.filter((contract) => contract?.founder_id === currentUserId);
  }, [currentUserId, data?.items]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChatFilter>("all");
  const [chatMetaByContractId, setChatMetaByContractId] = useState<Record<string, ContractChatMeta>>({});
  const [publicProfilesByUserId, setPublicProfilesByUserId] = useState<Record<string, PublicProfileLite>>({});
  const [metaLoading, setMetaLoading] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [pushBanner, setPushBanner] = useState<PushBannerState | null>(null);
  const pushBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPushBanner = useCallback((nextBanner: PushBannerState) => {
    setPushBanner(nextBanner);
    if (pushBannerTimerRef.current) {
      clearTimeout(pushBannerTimerRef.current);
    }
    pushBannerTimerRef.current = setTimeout(() => {
      setPushBanner(null);
    }, PUSH_BANNER_VISIBLE_MS);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pushBannerTimerRef.current) {
        clearTimeout(pushBannerTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const userId = currentUserId;
    if (!userId || contracts.length === 0) {
      setChatMetaByContractId({});
      setMetaLoading(false);
      return;
    }

    let cancelled = false;
    setMetaLoading(true);

    (async () => {
      const entries = await Promise.all(
        contracts.map(async (contract) => {
          try {
            const res = await contractApi.getContractMessages(contract.id, { limit: 30 });
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
                lastMessage: last
                  ? normalizeMessageBody(last.body, last.message_type)
                  : `No messages`,
                lastMessageAt: last?.created_at || contract.updated_at || contract.created_at,
                unreadCount,
              } as ContractChatMeta,
            ] as const;
          } catch {
            return [
              contract.id,
              {
                lastMessage: `No messages`,
                lastMessageAt: contract.updated_at || contract.created_at,
                unreadCount: 0,
              } as ContractChatMeta,
            ] as const;
          }
        }),
      );

      if (cancelled) return;
      setChatMetaByContractId(Object.fromEntries(entries));
      setMetaLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [contracts, currentUserId]);

  useEffect(() => {
    const userId = session?.user?.id;
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

    const channel = supabase.channel(`founder-chat-realtime:${userId}:${Date.now()}`);

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
            lastMessage: `No messages`,
            lastMessageAt: null,
            unreadCount: 0,
          };
          return {
            ...prev,
            [incoming.contract_id]: {
              lastMessage: nextPreview,
              lastMessageAt: incoming.created_at || previous.lastMessageAt,
              unreadCount: isIncomingMessage ? previous.unreadCount + 1 : previous.unreadCount,
            },
          };
        });

        if (isIncomingMessage && AppState.currentState === "active") {
          const linkedContract = contracts.find((contract) => contract.id === incoming.contract_id);
          const remoteProfile = linkedContract
            ? publicProfilesByUserId[linkedContract.freelancer_id]
            : null;
          const senderName =
            remoteProfile?.display_name ||
            remoteProfile?.full_name ||
            remoteProfile?.username ||
            linkedContract?.freelancer?.full_name ||
            linkedContract?.freelancer?.handle ||
            "Freelancer";

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
          return {
            ...prev,
            [next.contract_id]: {
              ...existing,
              unreadCount: Math.max(0, existing.unreadCount - 1),
            },
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
  }, [contracts, publicProfilesByUserId, session?.user?.id, showPushBanner]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || contracts.length === 0) return;

    const freelancerIds = Array.from(
      new Set(
        contracts
          .map((contract) => contract.freelancer_id)
          .filter((id) => Boolean(id) && !publicProfilesByUserId[id]),
      ),
    );

    if (freelancerIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        freelancerIds.map(async (userId) => {
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
  }, [contracts, publicProfilesByUserId, session?.access_token]);

  const statusCounts = useMemo(() => {
    const unread = contracts.filter((contract) => (chatMetaByContractId[contract.id]?.unreadCount || 0) > 0).length;
    const read = contracts.filter((contract) => (chatMetaByContractId[contract.id]?.unreadCount || 0) === 0).length;
    return {
      all: contracts.length,
      unread,
      read,
    };
  }, [chatMetaByContractId, contracts]);

  const filteredContracts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const byFilter = contracts.filter((contract) => {
      const unreadCount = chatMetaByContractId[contract.id]?.unreadCount || 0;
      if (statusFilter === "unread") return unreadCount > 0;
      if (statusFilter === "read") return unreadCount === 0;
      return true;
    });

    const bySearch = byFilter.filter((contract) => {
      if (!query) return true;
      const remoteProfile = publicProfilesByUserId[contract.freelancer_id];
      const person =
        remoteProfile?.display_name ||
        remoteProfile?.full_name ||
        remoteProfile?.username ||
        contract.freelancer?.full_name ||
        contract.freelancer?.handle ||
        "freelancer";
      const title = contract.gig?.title || "contract";
      const role = remoteProfile?.role || remoteProfile?.user_type || roleLabel(contract);
      const lastMessage = chatMetaByContractId[contract.id]?.lastMessage || "";
      return (
        person.toLowerCase().includes(query) ||
        title.toLowerCase().includes(query) ||
        lastMessage.toLowerCase().includes(query) ||
        role.toLowerCase().includes(query)
      );
    });

    return [...bySearch].sort((a, b) => {
      const unreadA = chatMetaByContractId[a.id]?.unreadCount || 0;
      const unreadB = chatMetaByContractId[b.id]?.unreadCount || 0;
      if (unreadA !== unreadB) return unreadB - unreadA;

      const aPriority = a.status === "active" ? 0 : 1;
      const bPriority = b.status === "active" ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;

      const aTs = new Date(chatMetaByContractId[a.id]?.lastMessageAt || a.updated_at || a.created_at).getTime();
      const bTs = new Date(chatMetaByContractId[b.id]?.lastMessageAt || b.updated_at || b.created_at).getTime();
      return bTs - aTs;
    });
  }, [chatMetaByContractId, contracts, publicProfilesByUserId, searchQuery, statusFilter]);

  const contractsById = useMemo(() => {
    const map: Record<string, Contract> = {};
    contracts.forEach((contract) => {
      map[contract.id] = contract;
    });
    return map;
  }, [contracts]);

  const getOtherParty = useCallback((contract: Contract) => {
    const remoteProfile = publicProfilesByUserId[contract.freelancer_id];
    const freelancer = contract.freelancer;
    return {
      name:
        remoteProfile?.display_name ||
        remoteProfile?.full_name ||
        remoteProfile?.username ||
        freelancer?.full_name ||
        freelancer?.handle ||
        "Freelancer",
      avatar:
        remoteProfile?.photo_url ||
        remoteProfile?.avatar_url ||
        freelancer?.avatar_url ||
        undefined,
      role:
        remoteProfile?.role ||
        remoteProfile?.user_type ||
        roleLabel(contract),
    };
  }, [publicProfilesByUserId]);

  const openContractChat = useCallback(
    (contractId: string, fallbackName?: string) => {
      const contract = contractsById[contractId];
      const partyName = contract ? getOtherParty(contract).name : fallbackName || "Freelancer";
      setPushBanner(null);
      const threadRoute = pathname.includes("/(role-pager)/(founder-tabs)/")
        ? `/(role-pager)/(founder-tabs)/thread/${encodeURIComponent(contractId)}`
        : `/freelancer-stack/contract-chat-thread?contractId=${contractId}`;
      nav.push(
        `${threadRoute}${threadRoute.includes("?") ? "&" : "?"}title=${encodeURIComponent(partyName)}`,
      );
    },
    [contractsById, getOtherParty, nav, pathname],
  );

  if (isLoading) {
    return (
      <FlowScreen scroll={false}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 10,
              borderBottomColor: palette.borderLight,
              backgroundColor: palette.bg,
            },
          ]}
        >
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Chats</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Contract conversations</T>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: isRealtimeConnected ? "#22C55E" : "#F59E0B" }]} />
            <T weight="regular" color={palette.subText} style={styles.liveText}>
              {isRealtimeConnected ? "Live updates on" : "Reconnecting..."}
            </T>
          </View>
        </View>
        <View style={styles.contentPad}><LoadingState rows={6} /></View>
      </FlowScreen>
    );
  }

  if (error) {
    return (
      <FlowScreen scroll={false}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 10,
              borderBottomColor: palette.borderLight,
              backgroundColor: palette.bg,
            },
          ]}
        >
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Chats</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Contract conversations</T>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: isRealtimeConnected ? "#22C55E" : "#F59E0B" }]} />
            <T weight="regular" color={palette.subText} style={styles.liveText}>
              {isRealtimeConnected ? "Live updates on" : "Reconnecting..."}
            </T>
          </View>
        </View>
        <View style={styles.contentPad}>
          <ErrorState title="Failed to load conversations" message={error.message} onRetry={() => refetch()} />
        </View>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen scroll={false}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: palette.borderLight,
            backgroundColor: palette.bg,
          },
        ]}
      >
        <T weight="medium" color={palette.text} style={styles.pageTitle}>Chats</T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Contract conversations</T>
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
          onPress={() => openContractChat(pushBanner.contractId, pushBanner.senderName)}
          style={[
            styles.pushBanner,
            {
              backgroundColor: palette.surface,
              borderColor: palette.borderLight,
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
        data={filteredContracts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={palette.accent} />}
        ListHeaderComponent={
          <View style={styles.controlsWrap}>
            <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}> 
              <Ionicons name="search" size={16} color={palette.subText} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search chats"
                placeholderTextColor={palette.subText}
                style={[styles.searchInput, { color: palette.text }]}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
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
                    activeOpacity={0.84}
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
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-outline"
            title={searchQuery || statusFilter !== "all" ? "No matching chats" : "No chats yet"}
            subtitle={
              searchQuery || statusFilter !== "all"
                ? "Try another search term or filter."
                : "Accept a proposal to start contract conversations."
            }
          />
        }
        renderItem={({ item: contract }) => {
          const party = getOtherParty(contract);
          const meta = chatMetaByContractId[contract.id];
          const unreadCount = meta?.unreadCount || 0;
          const lastMessage = meta?.lastMessage || `No messages yet • ${contract.gig?.title || "Contract"}`;
          const lastTime = formatChatTime(meta?.lastMessageAt || contract.updated_at || contract.created_at);
          const isActive = contract.status === "active";

          return (
            <TouchableOpacity
              activeOpacity={0.84}
              style={styles.chatRow}
              onPress={() => openContractChat(contract.id, party.name)}
            >
              <View style={styles.avatarWrap}>
                {party.avatar ? (
                  <Avatar source={{ uri: party.avatar }} size={52} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: palette.accentSoft }]}> 
                    <T weight="medium" color={palette.accent} style={styles.avatarLetter}>
                      {firstLetter(party.name)}
                    </T>
                  </View>
                )}
                {isActive ? <View style={[styles.onlineDot, { borderColor: palette.bg }]} /> : null}
              </View>

              <View style={styles.rowMain}>
                <View style={styles.topLine}>
                  <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>
                    {party.name}
                  </T>
                  <T
                    weight="regular"
                    color={unreadCount > 0 ? palette.accent : palette.subText}
                    style={styles.timeText}
                  >
                    {lastTime}
                  </T>
                </View>

                <T weight="regular" color={palette.subText} style={styles.roleText} numberOfLines={1}>
                  {party.role}
                </T>

                <View style={styles.bottomLine}>
                  <T
                    weight="regular"
                    color={unreadCount > 0 ? palette.text : palette.subText}
                    style={styles.preview}
                    numberOfLines={1}
                  >
                    {lastMessage}
                  </T>

                  {unreadCount > 0 ? (
                    <View style={[styles.unreadBadge, { backgroundColor: palette.accent }]}> 
                      <T weight="medium" color="#fff" style={styles.unreadText}>
                        {unreadCount > 99 ? "99+" : String(unreadCount)}
                      </T>
                    </View>
                  ) : (
                    <Ionicons name="checkmark-done" size={15} color="#94A3B8" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: palette.borderLight }]} />}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
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
  contentPad: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 110,
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
  controlsWrap: {
    gap: 8,
    marginBottom: 6,
  },
  searchBar: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
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
  chatRow: {
    paddingVertical: 10,
    flexDirection: "row",
    gap: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 20,
    lineHeight: 24,
  },
  onlineDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: "#22C55E",
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 14,
    lineHeight: 18,
  },
  roleText: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  timeText: {
    fontSize: 10,
    lineHeight: 13,
  },
  preview: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 10,
    lineHeight: 12,
  },
  separator: {
    height: 1,
    marginLeft: 62,
  },
});
