import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

export default function ContractChatScreen() {
  const { palette, isDark } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen scroll={false}>
      <FlowTopBar
        title="Mobile App UI Design"
        showLeft={false}
        right="ellipsis-horizontal"
        onRightPress={() => nav.push("/freelancer-stack/leave-review")}
      />

      <View style={[styles.body, { backgroundColor: isDark ? "#1A090A" : palette.bg }]}> 
        <SurfaceCard style={styles.contractCard}>
          <View style={styles.kpiHead}>
            <View>
              <T weight="semiBold" color={palette.subText} style={styles.mini}>AGREED PRICE</T>
              <T weight="bold" color={palette.text} style={styles.price}>$2,500.00</T>
            </View>
            <View>
              <T weight="semiBold" color={palette.subText} style={styles.mini}>DEADLINE</T>
              <T weight="bold" color={palette.text} style={styles.deadline}>Oct 30, 2023</T>
            </View>
          </View>
          <T weight="medium" color={palette.subText} style={{ fontSize: 35 / 2.1, marginTop: 20 }}>Project Progress</T>
          <View style={[styles.track, { backgroundColor: palette.border }]}>
            <View style={[styles.progress, { backgroundColor: palette.accent }]} />
          </View>
          <T weight="bold" color={palette.accent} style={styles.progressTxt}>65%</T>
        </SurfaceCard>

        <View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
          <T weight="semiBold" color={palette.subText} style={styles.pillText}>PROPOSAL ACCEPTED • CHAT ACTIVE</T>
        </View>

        <View style={styles.chatCol}>
          <View style={styles.leftMsgWrap}>
            <View style={[styles.msg, styles.leftMsg, { backgroundColor: "#24334D" }]}> 
              <T color="#EAF0FF" style={styles.msgText}>
                Hi! I've started on the initial wireframes for the onboarding flow. I should have them ready for review
                by tomorrow afternoon.
              </T>
            </View>
            <View style={styles.avatarRow}>
              <Avatar source={people.alex} size={38} />
              <T weight="medium" color={palette.subText} style={styles.time}>10:42 AM</T>
            </View>
          </View>

          <View style={styles.rightMsgWrap}>
            <View style={[styles.msg, styles.rightMsg, { backgroundColor: palette.accent }]}> 
              <T color="#FFFFFF" style={styles.msgText}>
                That sounds great. Please focus on the payment integration screens first if possible.
              </T>
            </View>
            <T weight="medium" color={palette.subText} style={[styles.time, { textAlign: "right" }]}>10:45 AM</T>
          </View>
        </View>
      </View>

      <View style={[styles.composer, { backgroundColor: isDark ? "#091530" : palette.surface, borderTopColor: palette.border }]}> 
        <TouchableOpacity style={[styles.circle, { backgroundColor: isDark ? "#16213B" : palette.card }]}> 
          <Ionicons name="add" size={28} color={palette.subText} />
        </TouchableOpacity>
        <TextInput
          placeholder="Message freelancer..."
          placeholderTextColor={palette.subText}
          style={[styles.input, { color: palette.text, backgroundColor: isDark ? "#1B2944" : palette.card }]}
        />
        <TouchableOpacity style={[styles.send, { backgroundColor: palette.accent }]} onPress={() => nav.push("/freelancer-stack/leave-review")}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  contractCard: { padding: 20 },
  kpiHead: { flexDirection: "row", justifyContent: "space-between" },
  mini: { fontSize: 12, letterSpacing: 1 },
  price: { fontSize: 56 / 1.6, marginTop: 4 },
  deadline: { fontSize: 44 / 1.8, marginTop: 4 },
  track: { marginTop: 10, height: 16, borderRadius: 10 },
  progress: { width: "65%", height: "100%", borderRadius: 10 },
  progressTxt: { fontSize: 21, textAlign: "right", marginTop: 8 },
  pill: { marginTop: 14, borderWidth: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center" },
  pillText: { fontSize: 14, letterSpacing: 1.2 },
  chatCol: { flex: 1, paddingTop: 16, gap: 14 },
  leftMsgWrap: { alignItems: "flex-start" },
  rightMsgWrap: { alignItems: "flex-end" },
  msg: { borderRadius: 26, padding: 18, maxWidth: "86%" },
  leftMsg: { borderBottomLeftRadius: 8 },
  rightMsg: { borderBottomRightRadius: 8 },
  msgText: { fontSize: 40 / 2.2, lineHeight: 56 / 2.2 },
  avatarRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  time: { fontSize: 15 },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  circle: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  input: { flex: 1, height: 56, borderRadius: 28, paddingHorizontal: 20, fontFamily: "Poppins_500Medium", fontSize: 18 / 1.2 },
  send: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
});
