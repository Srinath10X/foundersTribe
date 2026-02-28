import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useFounderConnections } from "@/hooks/useFounderConnections";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import type { ServiceMessageRequest } from "@/types/gig";

const STORAGE_BUCKET = "tribe-media";

type ProfileLite = {
  display_name?: string | null;
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
  user_type?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
};

type RowItem =
  | { type: "section"; key: string; title: string; count: number }
  | { type: "thread"; key: string; request: ServiceMessageRequest; incoming: boolean };

function firstLetter(name: string) {
  const value = name.trim();
  if (!value) return "U";
  return value.charAt(0).toUpperCase();
}

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

  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function toTs(value: string | null | undefined): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
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

export default function FounderConnectionsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { theme, isDark } = useTheme();
  const currentUserId = session?.user?.id || "";

  const {
    requests,
    incomingPendingRequests,
    notificationCount,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useFounderConnections(true);

  const [query, setQuery] = useState("");
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, ProfileLite>>({});

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const counterpartIds = useMemo(() => {
    if (!currentUserId) return [] as string[];
    return Array.from(
      new Set(
        requests
          .map((request) =>
            request.founder_id === currentUserId ? request.freelancer_id : request.founder_id,
          )
          .filter(Boolean),
      ),
    );
  }, [currentUserId, requests]);

  const missingProfileIds = useMemo(
    () => counterpartIds.filter((id) => !profilesByUserId[id]),
    [counterpartIds, profilesByUserId],
  );

  useEffect(() => {
    const token = session?.access_token;
    if (!token || missingProfileIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        missingProfileIds.map(async (userId) => {
          try {
            const raw = await tribeApi.getPublicProfile(token, userId);
            const avatar = await resolveAvatar(raw?.photo_url || raw?.avatar_url || null, userId);
            return [
              userId,
              {
                ...raw,
                avatar_url: avatar || raw?.avatar_url || null,
                photo_url: avatar || raw?.photo_url || null,
              } as ProfileLite,
            ] as const;
          } catch {
            return [userId, null] as const;
          }
        }),
      );

      if (cancelled) return;
      setProfilesByUserId((prev) => {
        const next = { ...prev };
        entries.forEach(([id, profile]) => {
          if (profile) next[id] = profile;
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [missingProfileIds, session?.access_token]);

  const getCounterparty = useCallback(
    (request: ServiceMessageRequest) => {
      const otherUserId =
        request.founder_id === currentUserId ? request.freelancer_id : request.founder_id;
      const profile = profilesByUserId[otherUserId];
      const name =
        profile?.display_name || profile?.full_name || profile?.username || "Connection";
      const avatar = profile?.photo_url || profile?.avatar_url || undefined;
      return { id: otherUserId, name, avatar };
    },
    [currentUserId, profilesByUserId],
  );

  const incomingIds = useMemo(
    () => new Set(incomingPendingRequests.map((request) => request.id)),
    [incomingPendingRequests],
  );

  const chatThreads = useMemo(() => {
    const rows = requests.filter((request) => !incomingIds.has(request.id));
    return rows.sort((a, b) => {
      const aTs = toTs(a.last_message_at || a.updated_at || a.created_at);
      const bTs = toTs(b.last_message_at || b.updated_at || b.created_at);
      return bTs - aTs;
    });
  }, [incomingIds, requests]);

  const q = query.trim().toLowerCase();

  const filteredIncoming = useMemo(() => {
    if (!q) return incomingPendingRequests;
    return incomingPendingRequests.filter((request) => {
      const party = getCounterparty(request);
      const preview = request.request_message || request.last_message_preview || "";
      return (
        party.name.toLowerCase().includes(q) ||
        preview.toLowerCase().includes(q)
      );
    });
  }, [getCounterparty, incomingPendingRequests, q]);

  const filteredChats = useMemo(() => {
    if (!q) return chatThreads;
    return chatThreads.filter((request) => {
      const party = getCounterparty(request);
      const preview = request.last_message_preview || request.request_message || "";
      const serviceName = request.service?.service_name || "";
      return (
        party.name.toLowerCase().includes(q) ||
        preview.toLowerCase().includes(q) ||
        serviceName.toLowerCase().includes(q)
      );
    });
  }, [chatThreads, getCounterparty, q]);

  const rows = useMemo(() => {
    const data: RowItem[] = [];

    if (filteredIncoming.length > 0) {
      data.push({
        type: "section",
        key: "section-incoming",
        title: "Connection Requests",
        count: filteredIncoming.length,
      });
      filteredIncoming.forEach((request) => {
        data.push({
          type: "thread",
          key: `incoming-${request.id}`,
          request,
          incoming: true,
        });
      });
    }

    if (filteredChats.length > 0) {
      data.push({
        type: "section",
        key: "section-chats",
        title: "Chats",
        count: filteredChats.length,
      });
      filteredChats.forEach((request) => {
        data.push({
          type: "thread",
          key: `chat-${request.id}`,
          request,
          incoming: false,
        });
      });
    }

    return data;
  }, [filteredChats, filteredIncoming]);

  const openThread = useCallback(
    (request: ServiceMessageRequest) => {
      const party = getCounterparty(request);
      const avatar = party.avatar || "";
      router.push(
        `/(role-pager)/(founder-tabs)/thread/${encodeURIComponent(
          request.id,
        )}?threadKind=service&title=${encodeURIComponent(party.name)}&avatar=${encodeURIComponent(avatar)}`,
      );
    },
    [getCounterparty, router],
  );

  const renderItem = ({ item }: { item: RowItem }) => {
    if (item.type === "section") {
      return (
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
            {item.title}
          </Text>
          <Text style={[styles.sectionCount, { color: theme.text.tertiary }]}>
            {item.count}
          </Text>
        </View>
      );
    }

    const request = item.request;
    const party = getCounterparty(request);
    const unread = request.unread_count || 0;
    const preview =
      request.last_message_preview ||
      request.request_message ||
      (item.incoming ? "Sent a connection request" : "Start your conversation");
    const statusLabel = item.incoming ? "Wants to connect" : request.status;
    const timeText = formatChatTime(request.last_message_at || request.updated_at);

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        style={[styles.threadRow, { borderColor: theme.border, backgroundColor: theme.surface }]}
        onPress={() => openThread(request)}
      >
        {party.avatar ? (
          <Image source={{ uri: party.avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]}>
            <Text style={[styles.avatarLetter, { color: theme.brand.primary }]}>
              {firstLetter(party.name)}
            </Text>
          </View>
        )}

        <View style={styles.threadContent}>
          <View style={styles.threadTopRow}>
            <Text style={[styles.threadName, { color: theme.text.primary }]} numberOfLines={1}>
              {party.name}
            </Text>
            <Text style={[styles.threadTime, { color: unread > 0 || item.incoming ? theme.brand.primary : theme.text.tertiary }]}>
              {timeText}
            </Text>
          </View>

          <Text style={[styles.threadRole, { color: theme.text.secondary }]} numberOfLines={1}>
            {statusLabel}
          </Text>

          <View style={styles.threadBottomRow}>
            <Text
              style={[
                styles.threadPreview,
                { color: unread > 0 || item.incoming ? theme.text.primary : theme.text.secondary },
              ]}
              numberOfLines={1}
            >
              {preview}
            </Text>

            {item.incoming ? (
              <View style={[styles.badge, { backgroundColor: theme.brand.primary }]}>
                <Text style={styles.badgeText}>New</Text>
              </View>
            ) : unread > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.brand.primary }]}>
                <Text style={styles.badgeText}>{unread > 99 ? "99+" : String(unread)}</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={15} color={theme.text.tertiary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.surface }]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={18} color={theme.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: theme.text.primary }]}>Connections</Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            {incomingPendingRequests.length} requests • {requests.length} chats
          </Text>
        </View>

        <View style={[styles.notifyBubble, { backgroundColor: theme.surface }]}>
          <Ionicons name="notifications-outline" size={16} color={theme.text.secondary} />
          {notificationCount > 0 ? (
            <View style={[styles.notifyCount, { backgroundColor: theme.brand.primary }]}>
              <Text style={styles.notifyCountText}>
                {notificationCount > 99 ? "99+" : String(notificationCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.searchWrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Ionicons name="search-outline" size={16} color={theme.text.tertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder="Search requests and chats"
            placeholderTextColor={theme.text.tertiary}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={theme.brand.primary}
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Loading connections...</Text>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="chatbubbles-outline" size={34} color={theme.text.tertiary} />
                <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No connections yet</Text>
                <Text style={[styles.emptySub, { color: theme.text.secondary }]}>
                  When someone wants to connect, they will appear here.
                </Text>
                {error ? (
                  <Text style={[styles.emptySub, { color: theme.brand.primary }]}>
                    {error.message}
                  </Text>
                ) : null}
              </View>
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 34,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_400Regular",
  },
  notifyBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  notifyCount: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  notifyCountText: {
    color: "#fff",
    fontSize: 9,
    lineHeight: 10,
    fontFamily: "Poppins_700Bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchWrap: {
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
    gap: 8,
  },
  sectionRow: {
    marginTop: 6,
    marginBottom: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionCount: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins_500Medium",
  },
  threadRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 16,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
  },
  threadContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  threadTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  threadName: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
  },
  threadTime: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins_500Medium",
  },
  threadRole: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins_500Medium",
  },
  threadBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  threadPreview: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_400Regular",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    lineHeight: 12,
    fontFamily: "Poppins_700Bold",
  },
  emptyWrap: {
    marginTop: 72,
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});

