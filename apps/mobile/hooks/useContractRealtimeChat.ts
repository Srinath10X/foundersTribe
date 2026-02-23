import { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ContractMessage, gigService } from "@/lib/gigService";
import { supabase } from "@/lib/supabase";

export type ChatMessage = ContractMessage & {
  pending?: boolean;
  failed?: boolean;
  local_id?: string;
};

type Params = {
  contractId?: string;
};

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  const byId = new Map(existing.map((m) => [m.id, m]));

  const incomingClientMessageId =
    typeof incoming.metadata?.client_message_id === "string"
      ? incoming.metadata.client_message_id
      : null;

  if (incomingClientMessageId) {
    const optimistic = existing.find((m) => {
      const localClientMessageId =
        typeof m.metadata?.client_message_id === "string"
          ? m.metadata.client_message_id
          : null;
      return (
        !!m.pending &&
        m.sender_id === incoming.sender_id &&
        localClientMessageId === incomingClientMessageId
      );
    });

    if (optimistic) {
      byId.delete(optimistic.id);
    }
  }

  byId.set(incoming.id, { ...(byId.get(incoming.id) || {}), ...incoming, pending: false, failed: false });

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function useContractRealtimeChat({ contractId }: Params) {
  const [resolvedContractId, setResolvedContractId] = useState<string | null>(contractId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastReadSyncAtRef = useRef<number>(0);

  const syncReadState = useCallback(async () => {
    if (!resolvedContractId) return;
    const now = Date.now();
    if (now - lastReadSyncAtRef.current < 1500) return;
    lastReadSyncAtRef.current = now;
    try {
      await gigService.markContractMessagesRead(resolvedContractId);
    } catch {
      // Non-blocking for UX; read sync will retry in later events.
    }
  }, [resolvedContractId]);

  const loadInitialMessages = useCallback(async (cid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: sessionData }, list] = await Promise.all([
        supabase.auth.getUser(),
        gigService.getContractMessages(cid, { limit: 100 }),
      ]);
      setCurrentUserId(sessionData.user?.id ?? null);
      const ordered = [...list.items].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      setMessages(ordered);
      await syncReadState();
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
  }, [contractId]);

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
          setMessages((prev) => mergeMessages(prev, incoming));
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

      setMessages((prev) => mergeMessages(prev, optimistic));

      try {
        const serverMessage = await gigService.sendContractMessage(resolvedContractId, {
          message_type: "text",
          body: text,
          metadata: { client_message_id: clientMessageId },
        });
        setMessages((prev) => mergeMessages(prev, serverMessage));
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) => (m.id === localId ? { ...m, pending: false, failed: true } : m)),
        );
        setError(e instanceof Error ? e.message : "Failed to send message");
      } finally {
        setSending(false);
      }
    },
    [resolvedContractId, currentUserId],
  );

  const retryFailedMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!msg.failed || msg.message_type !== "text" || !msg.body) return;
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      await sendTextMessage(msg.body);
    },
    [sendTextMessage],
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
      sendTextMessage,
      retryFailedMessage,
      refresh: () => (resolvedContractId ? loadInitialMessages(resolvedContractId) : Promise.resolve()),
    }),
    [
      resolvedContractId,
      messages,
      loading,
      sending,
      error,
      isRealtimeConnected,
      currentUserId,
      sendTextMessage,
      retryFailedMessage,
      loadInitialMessages,
    ],
  );
}
