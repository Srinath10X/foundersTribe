import { useLocalSearchParams } from "expo-router";
import React from "react";

import ThreadIdComponent from "@/components/community/freelancerFlow/[threadId]";

export default function FreelancerThreadRoute() {
  const params = useLocalSearchParams<{
    threadId?: string;
    title?: string;
    avatar?: string;
  }>();

  return (
    <ThreadIdComponent
      threadId={params.threadId}
      title={params.title}
      avatar={params.avatar ? decodeURIComponent(String(params.avatar)) : undefined}
    />
  );
}
