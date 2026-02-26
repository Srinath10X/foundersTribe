import { useLocalSearchParams } from "expo-router";
import React from "react";

import ThreadScreen from "@/components/community/freelancerFlow/ThreadScreen";

function asSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ContractChatThreadScreen() {
  const params = useLocalSearchParams<{
    contractId?: string | string[];
    requestId?: string | string[];
    threadKind?: string | string[];
    title?: string | string[];
  }>();
  const contractId = asSingleParam(params.contractId);
  const requestId = asSingleParam(params.requestId);
  const threadKindRaw = asSingleParam(params.threadKind);
  const threadKind = threadKindRaw === "service" ? "service" : "contract";
  const title = asSingleParam(params.title);
  const resolvedId = threadKind === "service" ? requestId : contractId;

  return <ThreadScreen threadId={resolvedId} title={title} threadKind={threadKind} />;
}
