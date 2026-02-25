import { useLocalSearchParams } from "expo-router";
import React from "react";

import ThreadScreen from "@/components/community/freelancerFlow/ThreadScreen";

function asSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ContractChatThreadScreen() {
  const params = useLocalSearchParams<{ contractId?: string | string[]; title?: string | string[] }>();
  const contractId = asSingleParam(params.contractId);
  const title = asSingleParam(params.title);

  return <ThreadScreen threadId={contractId} title={title} />;
}
