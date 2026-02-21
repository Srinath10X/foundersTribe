import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { Avatar, FlowScreen, FlowTopBar, SurfaceCard, T, people, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

export default function TalentChatThreadScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <FlowTopBar title="Alex Rivers" onLeftPress={nav.back} right="ellipsis-horizontal" onRightPress={() => {}} />

        <View style={[styles.body, { backgroundColor: palette.bg }]}> 
          <SurfaceCard style={styles.contextCard}>
            <T weight="semiBold" color={palette.subText} style={styles.small}>CONTRACT</T>
            <T weight="bold" color={palette.text} style={styles.title}>SaaS Platform Redesign</T>
            <T weight="medium" color={palette.subText} style={styles.small}>Milestone 3 of 4 • Due in 2 days</T>
          </SurfaceCard>

          <View style={styles.chatCol}>
            <View style={styles.leftWrap}>
              <View style={[styles.msg, { backgroundColor: palette.surface }]}> 
                <T color={palette.text} style={styles.msgText}>Could you share the revised onboarding screens today?</T>
              </View>
              <View style={styles.avatarRow}><Avatar source={people.alex} size={30} /><T weight="medium" color={palette.subText} style={styles.time}>10:42 AM</T></View>
            </View>

            <View style={styles.rightWrap}>
              <View style={[styles.msg, { backgroundColor: palette.accent }]}> 
                <T color="#fff" style={styles.msgText}>Yes, I will deliver the updated Figma file by evening.</T>
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
            placeholder="Message founder..."
            placeholderTextColor={palette.subText}
            style={[styles.input, { color: palette.text, backgroundColor: palette.card }]}
          />
          <TouchableOpacity style={[styles.circle, { backgroundColor: palette.accent }]}> 
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  contextCard: { padding: 12 },
  small: { fontSize: 11, letterSpacing: 0.8 },
  title: { fontSize: 16, marginTop: 3 },
  chatCol: { flex: 1, paddingTop: 14, gap: 12 },
  leftWrap: { alignItems: "flex-start" },
  rightWrap: { alignItems: "flex-end" },
  msg: { borderRadius: 16, padding: 12, maxWidth: "84%" },
  msgText: { fontSize: 14, lineHeight: 21 },
  avatarRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  time: { fontSize: 11 },
  composer: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 8 },
  circle: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, height: 46, borderRadius: 23, paddingHorizontal: 14, fontFamily: "Poppins_500Medium", fontSize: 14 },
});
