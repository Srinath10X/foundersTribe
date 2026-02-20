import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Avatar, FlowScreen, FlowTopBar, SurfaceCard, T, people, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

const threads = [
  { name: "Alex Rivers", msg: "Please share updated prototypes today.", time: "10:42 AM", unread: 2, avatar: people.alex },
  { name: "Sarah Chen", msg: "Looks good. Let us finalize tomorrow.", time: "Yesterday", unread: 0, avatar: people.sarah },
];

export default function TalentMessagesScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Messages" showLeft={false} right="search" onRightPress={() => {}} />
      <View style={styles.content}>
        {threads.map((t) => (
          <TouchableOpacity key={t.name} onPress={() => nav.push("/talent-stack/chat-thread")} activeOpacity={0.9}>
            <SurfaceCard style={styles.card}>
              <View style={styles.row}>
                <Avatar source={t.avatar} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T weight="bold" color={palette.text} style={styles.name}>{t.name}</T>
                  <T weight="medium" color={palette.subText} style={styles.msg} numberOfLines={1}>{t.msg}</T>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <T weight="medium" color={palette.subText} style={styles.time}>{t.time}</T>
                  {t.unread > 0 ? (
                    <View style={[styles.badge, { backgroundColor: palette.accent }]}>
                      <T weight="bold" color="#fff" style={styles.badgeTxt}>{t.unread}</T>
                    </View>
                  ) : null}
                </View>
              </View>
            </SurfaceCard>
          </TouchableOpacity>
        ))}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  card: { padding: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 15 },
  msg: { fontSize: 13, marginTop: 1 },
  time: { fontSize: 11 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", marginTop: 6 },
  badgeTxt: { fontSize: 11 },
});
