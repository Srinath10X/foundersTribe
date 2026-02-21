import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

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

export default function ContractChatThreadScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <FlowTopBar title="Priya Sharma • Contract Chat" onLeftPress={nav.back} right="ellipsis-horizontal" onRightPress={() => {}} />

        <View style={[styles.body, { backgroundColor: palette.bg }]}> 
          <SurfaceCard style={styles.contractCard}>
            <View style={styles.kpiHead}>
              <View>
                <T weight="semiBold" color={palette.subText} style={styles.mini}>AGREED PRICE</T>
                <T weight="bold" color={palette.text} style={styles.price}>₹2,500.00</T>
              </View>
              <View>
                <T weight="semiBold" color={palette.subText} style={styles.mini}>DEADLINE</T>
                <T weight="bold" color={palette.text} style={styles.deadline}>Oct 30, 2023</T>
              </View>
            </View>
          </SurfaceCard>

          <View style={styles.chatCol}>
            <View style={styles.leftMsgWrap}>
              <View style={[styles.msg, styles.leftMsg, { backgroundColor: palette.surface }]}> 
                <T color={palette.text} style={styles.msgText}>I have finished milestone 2 and pushed final screens for review.</T>
              </View>
              <View style={styles.avatarRow}>
                <Avatar source={people.sarah} size={34} />
                <T weight="medium" color={palette.subText} style={styles.time}>10:42 AM</T>
              </View>
            </View>

            <View style={styles.rightMsgWrap}>
              <View style={[styles.msg, styles.rightMsg, { backgroundColor: palette.accent }]}> 
                <T color="#FFFFFF" style={styles.msgText}>Perfect, sharing this with the team now. Let's proceed to handoff prep.</T>
              </View>
              <T weight="medium" color={palette.subText} style={[styles.time, { textAlign: "right" }]}>10:45 AM</T>
            </View>
          </View>
        </View>

        <View style={[styles.composer, { backgroundColor: palette.surface, borderTopColor: palette.borderLight }]}> 
          <TouchableOpacity style={[styles.circle, { backgroundColor: palette.card }]}> 
            <Ionicons name="add" size={24} color={palette.subText} />
          </TouchableOpacity>
          <TextInput
            placeholder="Message freelancer..."
            placeholderTextColor={palette.subText}
            style={[styles.input, { color: palette.text, backgroundColor: palette.card }]}
          />
          <TouchableOpacity style={[styles.send, { backgroundColor: palette.accent }]}>
            <Ionicons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 14 },
  contractCard: { padding: 14 },
  kpiHead: { flexDirection: "row", justifyContent: "space-between" },
  mini: { fontSize: 10, letterSpacing: 0.8 },
  price: { fontSize: 21, marginTop: 2 },
  deadline: { fontSize: 17, marginTop: 2 },
  chatCol: { flex: 1, paddingTop: 14, gap: 12 },
  leftMsgWrap: { alignItems: "flex-start" },
  rightMsgWrap: { alignItems: "flex-end" },
  msg: { borderRadius: 18, padding: 13, maxWidth: "84%" },
  leftMsg: { borderBottomLeftRadius: 8 },
  rightMsg: { borderBottomRightRadius: 8 },
  msgText: { fontSize: 14, lineHeight: 21 },
  avatarRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 7 },
  time: { fontSize: 12 },
  composer: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 8 },
  circle: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  input: { flex: 1, height: 48, borderRadius: 24, paddingHorizontal: 16, fontFamily: "Poppins_500Medium", fontSize: 14 },
  send: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
});
