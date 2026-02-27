import { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { gigService } from "@/lib/gigService";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import type { ServiceRequestMessage, ServiceRequestStatus } from "@/types/gig";

export type ServiceChatMessage = ServiceRequestMessage & {
  pending?: boolean;
  failed?: boolean;
  local_id?: string;
};

type Params = {
  requestId?: string;
};

type ViewerRole = "founder" | "freelancer" | null;

type CounterpartyProfile = {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  source: "tribe" | "request";
};

const OPTIMISTIC_MATCH_WINDOW_MS = 2 * 60 * 1000;
const COMMITTED_DUPLICATE_WINDOW_MS = 8 * 1000;
const MESSAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const READ_SYNC_MIN_GAP_MS = 8000;
const STORAGE_BUCKET = "tribe-media";

type MessageCacheEntry = {
  items: ServiceChatMessage[];
  cachedAt: number;
};

const messageCacheByRequestId = new Map<string, MessageCacheEntry>();

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function formatRole(raw?: string | null, fallback = "Member") {
  if (!raw) return fallback;
  if (/^founder$/i.test(raw)) return "Founder";
  if (/^freelancer$/i.test(raw)) return "Freelancer";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function mergeMessages(existing: ServiceChatMessage[], incoming: ServiceChatMessage): ServiceChatMessage[] {
  const byId = new Map(existing.map((m) => [m.id, m]));

  const incomingClientMessageId =
    typeof incoming.metadata?.client_message_id === "string"
      ? incoming.metadata.client_message_id
      : null;

  if (incomingClientMessageId) {
    const localMatches = existing.filter((m) => {
      const localClientMessageId =
        typeof m.metadata?.client_message_id === "string"
          ? m.metadata.client_message_id
          : null;
      return m.sender_id === incoming.sender_id && localClientMessageId === incomingClientMessageId;
    });

    localMatches.forEach((match) => {
      if (match.id !== incoming.id) byId.delete(match.id);
    });
  }

  if (!incomingClientMessageId && !incoming.pending) {
    const incomingTs = new Date(incoming.created_at).getTime();
    const optimisticByHeuristic = existing.find((m) => {
      if (!m.pending || m.failed) return false;
      if (m.sender_id !== incoming.sender_id) return false;
      if ((m.body || "") !== (incoming.body || "")) return false;
      const localTs = new Date(m.created_at).getTime();
      if (Number.isNaN(localTs) || Number.isNaN(incomingTs)) return false;
      return Math.abs(incomingTs - localTs) <= OPTIMISTIC_MATCH_WINDOW_MS;
    });
    if (optimisticByHeuristic) {
      byId.delete(optimisticByHeuristic.id);
    }
  }

  if (!incoming.pending) {
    const incomingTs = new Date(incoming.created_at).getTime();
    const committedDuplicate = existing.find((m) => {
      if (m.id === incoming.id) return false;
      if (m.pending || m.failed) return false;
      if (m.sender_id !== incoming.sender_id) return false;
      if ((m.body || "") !== (incoming.body || "")) return false;
      const localTs = new Date(m.created_at).getTime();
      if (Number.isNaN(localTs) || Number.isNaN(incomingTs)) return false;
      return Math.abs(incomingTs - localTs) <= COMMITTED_DUPLICATE_WINDOW_MS;
    });
    if (committedDuplicate) {
      byId.delete(committedDuplicate.id);
    }
  }

  byId.set(incoming.id, { ...(byId.get(incoming.id) || {}), ...incoming, pending: false, failed: false });

  return Array.from(byId.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function mergeFetchedMessages(existing: ServiceChatMessage[], fetched: ServiceRequestMessage[]): ServiceChatMessage[] {
  let merged: ServiceChatMessage[] = existing.filter((m) => m.pending || m.failed);
  const ordered = [...fetched].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  ordered.forEach((message) => {
    merged = mergeMessages(merged, message);
  });
  return merged;
}

function buildMessageCacheKey(ownerId: string | null | undefined, requestId: string) {
  return `${ownerId || "anon"}::${requestId}`;
}

function getCachedMessages(cacheKey: string): ServiceChatMessage[] | null {
  const cached = messageCacheByRequestId.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > MESSAGE_CACHE_TTL_MS) {
    messageCacheByRequestId.delete(cacheKey);
    return null;
  }
  return cached.items;
}

function setCachedMessages(cacheKey: string, items: ServiceChatMessage[]) {
  messageCacheByRequestId.set(cacheKey, {
    items: [...items],
    cachedAt: Date.now(),
  });
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

export function useServiceRequestRealtimeChat({ requestId }: Params) {
  const [resolvedRequestId, setResolvedRequestId] = useState<string | null>(requestId ?? null);
  const [messages, setMessages] = useState<ServiceChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);
  const [founderId, setFounderId] = useState<string | null>(null);
  const [freelancerId, setFreelancerId] = useState<string | null>(null);
  const [serviceRequestStatus, setServiceRequestStatus] = useState<ServiceRequestStatus | null>(null);
  const [viewerRole, setViewerRole] = useState<ViewerRole>(null);
  const [counterpartyProfile, setCounterpartyProfile] = useState<CounterpartyProfile | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastReadSyncAtRef = useRef<number>(0);
  const isSendingRef = useRef(false);

  useEffect(() => {
    setResolvedRequestId(requestId ?? null);
  }, [requestId]);

  const syncReadState = useCallback(async () => {
    if (!resolvedRequestId) return;
    const now = Date.now();
    if (now - lastReadSyncAtRef.current < READ_SYNC_MIN_GAP_MS) return;
    lastReadSyncAtRef.current = now;
    try {
      await gigService.markServiceRequestMessagesRead(resolvedRequestId);
    } catch {
      // no-op
    }
  }, [resolvedRequestId]);

  const loadInitialMessages = useCallback(async (rid: string, forceRemote = false) => {
    setError(null);

    try {
      const [{ data: sessionData }, request] = await Promise.all([
        supabase.auth.getSession(),
        gigService.getServiceRequest(rid).catch(() => null),
      ]);
      const accessToken = sessionData.session?.access_token || null;
      const loggedInUserId = sessionData.session?.user?.id ?? null;
      setCurrentUserId(loggedInUserId);
      const cacheKey = buildMessageCacheKey(loggedInUserId, rid);
      const cachedMessages = forceRemote ? null : getCachedMessages(cacheKey);
      setLoading(!cachedMessages);
      if (cachedMessages) {
        setMessages(cachedMessages);
      }

      if (loggedInUserId && request) {
        setFounderId(request.founder_id || null);
        setFreelancerId(request.freelancer_id || null);
        setServiceRequestStatus(request.status || null);
        const nextViewerRole: ViewerRole =
          request.founder_id === loggedInUserId
            ? "founder"
            : request.freelancer_id === loggedInUserId
              ? "freelancer"
              : null;
        setViewerRole(nextViewerRole);

        const otherPartyId = request.founder_id === loggedInUserId ? request.freelancer_id : request.founder_id;
        setCounterpartyId(otherPartyId || null);

        const fallbackName = nextViewerRole === "founder" ? "Freelancer" : "Founder";
        const fallbackRole = nextViewerRole === "founder" ? "Freelancer" : "Founder";

        if (otherPartyId && accessToken) {
          try {
            const raw = await tribeApi.getPublicProfile(accessToken, otherPartyId);
            const avatar =
              (await resolveAvatar(firstString(raw?.photo_url, raw?.avatar_url), otherPartyId)) ||
              firstString(raw?.photo_url, raw?.avatar_url) ||
              null;
            setCounterpartyProfile({
              id: otherPartyId,
              name: firstString(raw?.display_name, raw?.full_name, raw?.username, fallbackName) || fallbackName,
              role: formatRole(firstString(raw?.role, raw?.user_type), fallbackRole),
              avatar,
              source: "tribe",
            });
          } catch {
            setCounterpartyProfile({
              id: otherPartyId,
              name: fallbackName,
              role: fallbackRole,
              avatar: null,
              source: "request",
            });
          }
        } else if (otherPartyId) {
          setCounterpartyProfile({
            id: otherPartyId,
            name: fallbackName,
            role: fallbackRole,
            avatar: null,
            source: "request",
          });
        }
      } else {
        setCounterpartyId(null);
        setFounderId(null);
        setFreelancerId(null);
        setServiceRequestStatus(null);
        setViewerRole(null);
        setCounterpartyProfile(null);
      }

      if (!cachedMessages || forceRemote) {
        const list = await gigService.getServiceRequestMessages(rid, { limit: 100 });
        const ordered = [...list.items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setMessages((prev) => {
          const next = mergeFetchedMessages(prev, ordered);
          setCachedMessages(cacheKey, next);
          return next;
        });
        await syncReadState();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [syncReadState]);

  useEffect(() => {
    if (!resolvedRequestId) {
      setLoading(false);
      return;
    }
    loadInitialMessages(resolvedRequestId);
  }, [resolvedRequestId, loadInitialMessages]);

  useEffect(() => {
    if (!resolvedRequestId) return;

    channelRef.current = supabase
      .channel(`service-request-messages:${resolvedRequestId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_request_messages",
          filter: `request_id=eq.${resolvedRequestId}`,
        },
        (payload) => {
          const incoming = payload.new as ServiceRequestMessage;
          setMessages((prev) => {
            const next = mergeMessages(prev, incoming);
            const cacheKey = buildMessageCacheKey(currentUserId, resolvedRequestId);
            setCachedMessages(cacheKey, next);
            return next;
          });
          if (incoming.sender_id !== currentUserId) {
            syncReadState();
          }
        },
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      setIsRealtimeConnected(false);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [resolvedRequestId, currentUserId, syncReadState]);

  const sendTextMessage = useCallback(async (body: string) => {
    const text = body.trim();
    if (!text || !resolvedRequestId || !currentUserId) return;
    if (isSendingRef.current) return;

    isSendingRef.current = true;
    setSending(true);
    setError(null);

    const clientMessageId = `cmid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const localId = `local-${clientMessageId}`;
    const optimistic: ServiceChatMessage = {
      id: localId,
      local_id: localId,
      request_id: resolvedRequestId,
      sender_id: currentUserId,
      recipient_id: null,
      message_type: "text",
      body: text,
      file_url: null,
      metadata: { client_message_id: clientMessageId },
      read_at: null,
      created_at: new Date().toISOString(),
      pending: true,
      failed: false,
    };

    setMessages((prev) => {
      const next = mergeMessages(prev, optimistic);
      const cacheKey = buildMessageCacheKey(currentUserId, resolvedRequestId);
      setCachedMessages(cacheKey, next);
      return next;
    });

    try {
      const serverMessage = await gigService.sendServiceRequestMessage(resolvedRequestId, {
        message_type: "text",
        body: text,
        recipient_id: counterpartyId || undefined,
        metadata: { client_message_id: clientMessageId },
      });
      setMessages((prev) => {
        const next = mergeMessages(prev, serverMessage);
        const cacheKey = buildMessageCacheKey(currentUserId, resolvedRequestId);
        setCachedMessages(cacheKey, next);
        return next;
      });
    } catch (e) {
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === localId ? { ...m, pending: false, failed: true } : m));
        const cacheKey = buildMessageCacheKey(currentUserId, resolvedRequestId);
        setCachedMessages(cacheKey, next);
        return next;
      });
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  }, [counterpartyId, currentUserId, resolvedRequestId]);

  const retryFailedMessage = useCallback(async (msg: ServiceChatMessage) => {
    if (!msg.failed || msg.message_type !== "text" || !msg.body) return;
    if (!resolvedRequestId) return;
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== msg.id);
      const cacheKey = buildMessageCacheKey(currentUserId, resolvedRequestId);
      setCachedMessages(cacheKey, next);
      return next;
    });
    await sendTextMessage(msg.body);
  }, [currentUserId, resolvedRequestId, sendTextMessage]);

  return useMemo(() => ({
    requestId: resolvedRequestId,
    messages,
    loading,
    sending,
    error,
    isRealtimeConnected,
    currentUserId,
    founderId,
    freelancerId,
    serviceRequestStatus,
    viewerRole,
    counterpartyProfile,
    sendTextMessage,
    retryFailedMessage,
    refresh: (forceRemote = false) =>
      (resolvedRequestId ? loadInitialMessages(resolvedRequestId, forceRemote) : Promise.resolve()),
  }), [
    resolvedRequestId,
    messages,
    loading,
    sending,
    error,
    isRealtimeConnected,
    currentUserId,
    founderId,
    freelancerId,
    serviceRequestStatus,
    viewerRole,
    counterpartyProfile,
    sendTextMessage,
    retryFailedMessage,
    loadInitialMessages,
  ]);
}
