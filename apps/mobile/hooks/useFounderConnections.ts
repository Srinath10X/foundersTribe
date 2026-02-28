import { useMemo } from "react";

import { useAuth } from "@/context/AuthContext";
import { useServiceRequests } from "@/hooks/useGig";
import type { ServiceMessageRequest } from "@/types/gig";

const REQUEST_FETCH_LIMIT = 100;

export function useFounderConnections(enabled = true) {
  const { session } = useAuth();
  const currentUserId = session?.user?.id || "";

  const query = useServiceRequests(
    { limit: REQUEST_FETCH_LIMIT },
    enabled && !!currentUserId,
    "founder-connections",
  );

  const requests = useMemo(() => {
    const all = query.data?.items ?? [];
    if (!currentUserId) return [] as ServiceMessageRequest[];
    return all.filter(
      (request) =>
        request.founder_id === currentUserId || request.freelancer_id === currentUserId,
    );
  }, [currentUserId, query.data?.items]);

  const incomingPendingRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.freelancer_id === currentUserId && request.status === "pending",
      ),
    [currentUserId, requests],
  );

  const notificationCount = useMemo(() => {
    let total = 0;
    requests.forEach((request) => {
      const hasUnread = (request.unread_count || 0) > 0;
      const isIncomingPending =
        request.freelancer_id === currentUserId && request.status === "pending";
      if (hasUnread || isIncomingPending) total += 1;
    });
    return total;
  }, [currentUserId, requests]);

  return {
    ...query,
    requests,
    incomingPendingRequests,
    notificationCount,
  };
}
