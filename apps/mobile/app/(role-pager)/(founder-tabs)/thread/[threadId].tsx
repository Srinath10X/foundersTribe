import { useLocalSearchParams } from "expo-router";
import React from "react";

import ThreadIdComponent from "@/components/community/freelancerFlow/[threadId]";

function asSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function FounderThreadRoute() {
  const params = useLocalSearchParams<{
    threadId?: string | string[];
    title?: string | string[];
    avatar?: string | string[];
  }>();
  const threadIdParam = asSingleParam(params.threadId);
  const titleParam = asSingleParam(params.title);
  const avatarParam = asSingleParam(params.avatar);

  return (
    <ThreadIdComponent
      threadId={threadIdParam}
      title={titleParam}
      avatar={avatarParam ? decodeURIComponent(avatarParam) : undefined}
    />
  );
}
