import { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ContractMessage, gigService } from "@/lib/gigService";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

export type ChatMessage = ContractMessage & {
  pending?: boolean;
  failed?: boolean;
  local_id?: string;
};

type Params = {
  contractId?: string;
  allowAutoResolve?: boolean;
};

const OPTIMISTIC_MATCH_WINDOW_MS = 2 * 60 * 1000;
const COMMITTED_DUPLICATE_WINDOW_MS = 8 * 1000;
const MESSAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const READ_SYNC_MIN_GAP_MS = 8000;
const STORAGE_BUCKET = "tribe-media";

type MessageCacheEntry = {
  items: ChatMessage[];
  cachedAt: number;
};

const messageCacheByContractId = new Map<string, MessageCacheEntry>();

type ViewerRole = "founder" | "freelancer" | null;

type CounterpartyProfile = {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  source: "tribe" | "contract";
};

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

async function resolveAvatar(candidate: unknown, userId: string): Promise<string | null> {
  try {
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
    const preferred = files.find((file) => /^avatar\./i.test(file.name)) || files[0];
    if (!preferred?.name) return null;

    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
    return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
  } catch {
    return null;
  }
}

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
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
      return (
        m.sender_id === incoming.sender_id && localClientMessageId === incomingClientMessageId
      );
    });

    localMatches.forEach((match) => {
      if (match.id !== incoming.id) byId.delete(match.id);
    });
  }

  // Fallback dedupe: if backend does not echo client_message_id, collapse the
  // local optimistic row by sender/body/time proximity.
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

  // Guard against duplicate committed rows when backend echoes same message via
  // different code paths (send response + realtime, or trigger fan-out).
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

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function mergeFetchedMessages(existing: ChatMessage[], fetched: ContractMessage[]): ChatMessage[] {
  let merged: ChatMessage[] = existing.filter((m) => m.pending || m.failed);
  const ordered = [...fetched].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  ordered.forEach((message) => {
    merged = mergeMessages(merged, message);
  });
  return merged;
}

function buildMessageCacheKey(ownerId: string | null | undefined, contractId: string) {
  return `${ownerId || "anon"}::${contractId}`;
}

function getCachedMessages(cacheKey: string): ChatMessage[] | null {
  const cached = messageCacheByContractId.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > MESSAGE_CACHE_TTL_MS) {
    messageCacheByContractId.delete(cacheKey);
    return null;
  }
  return cached.items;
}

function setCachedMessages(cacheKey: string, items: ChatMessage[]) {
  messageCacheByContractId.set(cacheKey, {
    items: [...items],
    cachedAt: Date.now(),
  });
}

export function useContractRealtimeChat({ contractId, allowAutoResolve = true }: Params) {
  const [resolvedContractId, setResolvedContractId] = useState<string | null>(contractId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);
  const [founderId, setFounderId] = useState<string | null>(null);
  const [freelancerId, setFreelancerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<ViewerRole>(null);
  const [counterpartyProfile, setCounterpartyProfile] = useState<CounterpartyProfile | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastReadSyncAtRef = useRef<number>(0);
  const isSendingRef = useRef(false);

  const syncReadState = useCallback(async () => {
    if (!resolvedContractId) return;
    const now = Date.now();
    if (now - lastReadSyncAtRef.current < READ_SYNC_MIN_GAP_MS) return;
    lastReadSyncAtRef.current = now;
    try {
      await gigService.markContractMessagesRead(resolvedContractId);
    } catch {
      // Non-blocking for UX; read sync will retry in later events.
    }
  }, [resolvedContractId]);

  const loadInitialMessages = useCallback(async (cid: string, forceRemote = false) => {
    setError(null);

    try {
      const [{ data: sessionData }, contract] = await Promise.all([
        supabase.auth.getSession(),
        gigService.getContract(cid).catch(() => null),
      ]);
      const accessToken = sessionData.session?.access_token || null;
      const loggedInUserId = sessionData.session?.user?.id ?? null;
      setCurrentUserId(loggedInUserId);
      const cacheKey = buildMessageCacheKey(loggedInUserId, cid);
      const cachedMessages = forceRemote ? null : getCachedMessages(cacheKey);
      setLoading(!cachedMessages);
      if (cachedMessages) {
        setMessages(cachedMessages);
      }

      if (loggedInUserId && contract) {
        setFounderId(contract.founder_id || null);
        setFreelancerId(contract.freelancer_id || null);
        const nextViewerRole: ViewerRole =
          contract.founder_id === loggedInUserId
            ? "founder"
            : contract.freelancer_id === loggedInUserId
              ? "freelancer"
              : null;
        setViewerRole(nextViewerRole);

        const otherPartyId =
          contract.founder_id === loggedInUserId ? contract.freelancer_id : contract.founder_id;
        setCounterpartyId(otherPartyId || null);

        const contractFallback = contract.founder_id === loggedInUserId ? contract.freelancer : contract.founder;
        const fallbackName =
          firstString(contractFallback?.full_name, contractFallback?.handle) ||
          (nextViewerRole === "founder" ? "Freelancer" : "Founder");
        const fallbackRole = nextViewerRole === "founder" ? "Freelancer" : "Founder";
        const fallbackAvatar = firstString(contractFallback?.avatar_url);

        if (otherPartyId && accessToken) {
          try {
            const raw = await tribeApi.getPublicProfile(accessToken, otherPartyId);
            const resolvedAvatar = await resolveAvatar(
              raw?.photo_url || raw?.avatar_url || fallbackAvatar || null,
              otherPartyId,
            );
            setCounterpartyProfile({
              id: otherPartyId,
              name: firstString(raw?.display_name, raw?.full_name, raw?.username, fallbackName) || fallbackName,
              role: formatRole(firstString(raw?.role, raw?.user_type), fallbackRole),
              avatar: resolvedAvatar || fallbackAvatar || null,
              source: "tribe",
            });
          } catch {
            setCounterpartyProfile({
              id: otherPartyId,
              name: fallbackName,
              role: fallbackRole,
              avatar: fallbackAvatar || null,
              source: "contract",
            });
          }
        } else if (otherPartyId) {
          setCounterpartyProfile({
            id: otherPartyId,
            name: fallbackName,
            role: fallbackRole,
            avatar: fallbackAvatar || null,
            source: "contract",
          });
        }
      } else {
        setCounterpartyId(null);
        setFounderId(null);
        setFreelancerId(null);
        setViewerRole(null);
        setCounterpartyProfile(null);
      }

      if (!cachedMessages || forceRemote) {
        const list = await gigService.getContractMessages(cid, { limit: 100 });
        const ordered = [...list.items].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
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
    let mounted = true;
    async function resolveContract() {
      if (contractId) {
        setResolvedContractId(contractId);
        setCounterpartyId(null);
        return;
      }
      if (!allowAutoResolve) {
        setResolvedContractId(null);
        setLoading(false);
        return;
      }
      try {
        const res = await gigService.getContracts({ status: "active", limit: 1 });
        if (mounted) {
          const nextContractId = res.items[0]?.id ?? null;
          setResolvedContractId(nextContractId);
          if (!nextContractId) {
            setLoading(false);
          }
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to resolve contract");
          setLoading(false);
        }
      }
    }
    resolveContract();
    return () => {
      mounted = false;
    };
  }, [allowAutoResolve, contractId]);

  useEffect(() => {
    if (!resolvedContractId) return;
    loadInitialMessages(resolvedContractId);
  }, [resolvedContractId, loadInitialMessages]);

  useEffect(() => {
    if (!resolvedContractId) return;

    channelRef.current = supabase
      .channel(`contract-messages:${resolvedContractId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `contract_id=eq.${resolvedContractId}`,
        },
        (payload) => {
          const incoming = payload.new as ContractMessage;
          setMessages((prev) => {
            const next = mergeMessages(prev, incoming);
            const cacheKey = buildMessageCacheKey(currentUserId, resolvedContractId);
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
  }, [resolvedContractId, currentUserId, syncReadState]);

  const sendTextMessage = useCallback(
    async (body: string) => {
      const text = body.trim();
      if (!text || !resolvedContractId || !currentUserId) return;
      if (isSendingRef.current) return;

      isSendingRef.current = true;
      setSending(true);
      setError(null);

      const clientMessageId = `cmid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const localId = `local-${clientMessageId}`;
      const optimistic: ChatMessage = {
        id: localId,
        local_id: localId,
        contract_id: resolvedContractId,
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
        const cacheKey = buildMessageCacheKey(currentUserId, resolvedContractId);
        setCachedMessages(cacheKey, next);
        return next;
      });

      try {
        const serverMessage = await gigService.sendContractMessage(resolvedContractId, {
          message_type: "text",
          body: text,
          recipient_id: counterpartyId || undefined,
          metadata: { client_message_id: clientMessageId },
        });
        setMessages((prev) => {
          const next = mergeMessages(prev, serverMessage);
          const cacheKey = buildMessageCacheKey(currentUserId, resolvedContractId);
          setCachedMessages(cacheKey, next);
          return next;
        });
      } catch (e) {
        setMessages((prev) => {
          const next = prev.map((m) => (m.id === localId ? { ...m, pending: false, failed: true } : m));
          const cacheKey = buildMessageCacheKey(currentUserId, resolvedContractId);
          setCachedMessages(cacheKey, next);
          return next;
        });
        setError(e instanceof Error ? e.message : "Failed to send message");
      } finally {
        setSending(false);
        isSendingRef.current = false;
      }
    },
    [counterpartyId, resolvedContractId, currentUserId],
  );

  const retryFailedMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!msg.failed || msg.message_type !== "text" || !msg.body) return;
      if (!resolvedContractId) return;
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== msg.id);
        const cacheKey = buildMessageCacheKey(currentUserId, resolvedContractId);
        setCachedMessages(cacheKey, next);
        return next;
      });
      await sendTextMessage(msg.body);
    },
    [currentUserId, resolvedContractId, sendTextMessage],
  );

  return useMemo(
    () => ({
      contractId: resolvedContractId,
      messages,
      loading,
      sending,
      error,
      isRealtimeConnected,
      currentUserId,
      founderId,
      freelancerId,
      viewerRole,
      counterpartyProfile,
      sendTextMessage,
      retryFailedMessage,
      refresh: (forceRemote = false) =>
        (resolvedContractId ? loadInitialMessages(resolvedContractId, forceRemote) : Promise.resolve()),
    }),
    [
      resolvedContractId,
      messages,
      loading,
      sending,
      error,
      isRealtimeConnected,
      currentUserId,
      founderId,
      freelancerId,
      viewerRole,
      counterpartyProfile,
      sendTextMessage,
      retryFailedMessage,
      loadInitialMessages,
    ],
  );
}
