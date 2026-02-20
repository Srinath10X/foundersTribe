import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  Badge,
  FlowScreen,
  FlowTopBar,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

type ContractChatItem = {
  id: string;
  freelancer: string;
  role: string;
  avatar: string;
  gigTitle: string;
  amount: string;
  deadline: string;
  lastMessage: string;
  time: string;
  unread: number;
  status: "active" | "completed";
};

const contractChats: ContractChatItem[] = [
  {
    id: "c-001",
    freelancer: "Sarah Chen",
    role: "Senior React Developer",
    avatar: people.sarah,
    gigTitle: "React Developer",
    amount: "$2,500",
    deadline: "Oct 30",
    lastMessage: "I have completed milestone 2 and shared updated UI files.",
    time: "10:42 AM",
    unread: 2,
    status: "active",
  },
  {
    id: "c-002",
    freelancer: "Alex Rivera",
    role: "UI/UX Designer",
    avatar: people.alex,
    gigTitle: "Senior UI Designer",
    amount: "$1,200",
    deadline: "Nov 05",
    lastMessage: "Can we confirm final revisions before handoff?",
    time: "Yesterday",
    unread: 0,
    status: "active",
  },
  {
    id: "c-003",
    freelancer: "Jordan Smith",
    role: "Product Designer",
    avatar: people.jordan,
    gigTitle: "Logo Design Project",
    amount: "$950",
    deadline: "Completed",
    lastMessage: "Thanks for the collaboration. Deliverables are final.",
    time: "2d ago",
    unread: 0,
    status: "completed",
  },
];

export default function ContractChatScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar
        title="Contract Chats"
        showLeft={false}
        right="funnel-outline"
        onRightPress={() => {}}
      />

      <View style={styles.content}>
        <View style={[styles.searchWrap, { backgroundColor: palette.border }]}> 
          <Ionicons name="search" size={16} color={palette.subText} />
          <TextInput
            placeholder="Search by freelancer or gig"
            placeholderTextColor={palette.subText}
            style={[styles.searchInput, { color: palette.text }]}
          />
        </View>

        <View style={styles.sectionHead}>
          <T weight="bold" color={palette.text} style={styles.sectionTitle}>All Contracts</T>
          <T weight="semiBold" color={palette.subText} style={styles.count}>{contractChats.length}</T>
        </View>

        {contractChats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            activeOpacity={0.9}
            onPress={() => nav.push("/freelancer-stack/contract-chat-thread")}
          >
            <SurfaceCard style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.personRow}>
                  <Avatar source={chat.avatar} size={42} />
                  <View style={{ flex: 1 }}>
                    <T weight="bold" color={palette.text} style={styles.name}>{chat.freelancer}</T>
                    <T weight="medium" color={palette.subText} style={styles.role}>{chat.role}</T>
                  </View>
                </View>

                <View style={styles.headRight}>
                  <Badge label={chat.status === "active" ? "Active" : "Completed"} tone={chat.status === "active" ? "success" : "neutral"} />
                  <T weight="medium" color={palette.subText} style={styles.time}>{chat.time}</T>
                </View>
              </View>

              <View style={[styles.metaRow, { borderColor: palette.border }]}> 
                <View style={styles.metaItem}><Ionicons name="briefcase-outline" size={14} color={palette.subText} /><T weight="medium" color={palette.subText} style={styles.metaText}>{chat.gigTitle}</T></View>
                <View style={styles.metaItem}><Ionicons name="cash-outline" size={14} color={palette.subText} /><T weight="medium" color={palette.subText} style={styles.metaText}>{chat.amount}</T></View>
                <View style={styles.metaItem}><Ionicons name="calendar-outline" size={14} color={palette.subText} /><T weight="medium" color={palette.subText} style={styles.metaText}>{chat.deadline}</T></View>
              </View>

              <View style={styles.lastRow}>
                <T weight="medium" color={palette.subText} style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">
                  {chat.lastMessage}
                </T>
                {chat.unread > 0 ? (
                  <View style={[styles.unread, { backgroundColor: palette.accent }]}> 
                    <T weight="bold" color="#fff" style={styles.unreadText}>{chat.unread}</T>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={palette.subText} />
                )}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  onPress={() => nav.push("/freelancer-stack/contract-details")}
                >
                  <T weight="semiBold" color={palette.text} style={styles.actionTxt}>View Contract</T>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: palette.accent }]}
                  onPress={() => nav.push("/freelancer-stack/contract-chat-thread")}
                >
                  <T weight="bold" color="#fff" style={styles.actionTxt}>Open Chat</T>
                </TouchableOpacity>
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
  searchWrap: {
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: "Poppins_500Medium", fontSize: 13 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  sectionTitle: { fontSize: 18 },
  count: { fontSize: 12 },

  card: { padding: 12 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  personRow: { flexDirection: "row", gap: 8, flex: 1 },
  name: { fontSize: 15 },
  role: { fontSize: 12, marginTop: 1 },
  headRight: { alignItems: "flex-end", gap: 6 },
  time: { fontSize: 11 },

  metaRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 8,
    gap: 6,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12 },

  lastRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  lastMessage: { fontSize: 13, flex: 1 },
  unread: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  unreadText: { fontSize: 11 },

  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTxt: { fontSize: 13 },
});
