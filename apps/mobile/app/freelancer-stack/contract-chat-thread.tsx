import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";

import ThreadScreen from "@/components/community/freelancerFlow/ThreadScreen";

function asSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ContractChatThreadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    contractId?: string | string[];
    requestId?: string | string[];
    threadKind?: string | string[];
    title?: string | string[];
  }>();
  const contractId = asSingleParam(params.contractId);
  const threadKindRaw = asSingleParam(params.threadKind);
  const title = asSingleParam(params.title);

  useEffect(() => {
    if (threadKindRaw === "service") {
      router.replace("/freelancer-stack/contract-chat");
    }
  }, [router, threadKindRaw]);

  if (threadKindRaw === "service") {
    return null;
  }

  const threadKind = "contract";
  const resolvedId = contractId;

  return <ThreadScreen threadId={resolvedId} title={title} threadKind={threadKind} />;
}
