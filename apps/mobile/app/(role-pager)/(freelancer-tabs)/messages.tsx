import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { SP, RADIUS, SHADOWS, SCREEN_PADDING } from "@/components/freelancer/designTokens";

const threads = [
  {
    name: "Arjun Patel",
    msg: "Please share updated prototypes today.",
    time: "10:42 AM",
    unread: 2,
    avatar: people.alex,
    online: true,
  },
  {
    name: "Priya Sharma",
    msg: "Looks good. Let us finalize tomorrow.",
    time: "Yesterday",
    unread: 0,
    avatar: people.sarah,
    online: false,
  },
];

export default function TalentMessagesScreen() {
  const { palette, isDark } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Messages" showLeft={false} right="create-outline" onRightPress={() => { }} />

      <View style={styles.content}>
        {threads.length === 0 ? (
          <EmptyState
            icon="chatbubble-outline"
            title="No Messages Yet"
            subtitle="Start a conversation with a client or freelancer."
          />
        ) : (
          threads.map((t) => (
            <TouchableOpacity
              key={t.name}
              onPress={() => nav.push(`/talent-stack/chat-thread?title=${encodeURIComponent(t.name)}`)}
              activeOpacity={1}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: palette.surface,
                    borderColor: t.unread > 0 ? palette.accent + '22' : palette.borderLight,
                  },
                ]}
              >
                <View style={styles.row}>
                  {/* Avatar with online dot */}
                  <View style={styles.avatarWrap}>
                    <Avatar source={t.avatar} size={48} />
                    {t.online && (
                      <View style={[styles.onlineDot, { borderColor: palette.surface }]}>
                        <View style={styles.onlineDotInner} />
                      </View>
                    )}
                  </View>

                  {/* Text content */}
                  <View style={styles.textWrap}>
                    <View style={styles.nameRow}>
                      <T
                        weight={t.unread > 0 ? "bold" : "semiBold"}
                        color={palette.text}
                        style={styles.name}
                        numberOfLines={1}
                      >
                        {t.name}
                      </T>
                      <T weight="medium" color={palette.mutedText} style={styles.time}>
                        {t.time}
                      </T>
                    </View>
                    <View style={styles.msgRow}>
                      <T
                        weight={t.unread > 0 ? "medium" : "regular"}
                        color={t.unread > 0 ? palette.text : palette.subText}
                        style={styles.msg}
                        numberOfLines={1}
                      >
                        {t.msg}
                      </T>
                      {t.unread > 0 && (
                        <View style={[styles.badge, { backgroundColor: palette.accent }]}>
                          <T weight="bold" color="#fff" style={styles.badgeTxt}>
                            {t.unread}
                          </T>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SP._12,
    gap: SP._8,
  },
  card: {
    padding: SP._16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP._12,
  },
  avatarWrap: {
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#34C759",
  },
  onlineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SP._4,
  },
  name: {
    fontSize: 16,
    flex: 1,
    marginRight: SP._8,
  },
  time: {
    fontSize: 12,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP._8,
  },
  msg: {
    fontSize: 14,
    flex: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: SP._8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt: {
    fontSize: 11,
  },
});
