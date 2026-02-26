import React from "react";

import ThreadScreen from "./ThreadScreen";

type ThreadIdComponentProps = {
  threadId?: string;
  title?: string;
  avatar?: string;
  threadKind?: "contract" | "service";
};

export default function ThreadIdComponent(props: ThreadIdComponentProps) {
  return <ThreadScreen {...props} />;
}
