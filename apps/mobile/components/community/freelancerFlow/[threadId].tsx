import React from "react";

import ThreadScreen from "./ThreadScreen";

type ThreadIdComponentProps = {
  threadId?: string;
  title?: string;
  avatar?: string;
};

export default function ThreadIdComponent(props: ThreadIdComponentProps) {
  return <ThreadScreen {...props} />;
}
