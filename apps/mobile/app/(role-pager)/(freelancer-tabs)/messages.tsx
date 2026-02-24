import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { Avatar, FlowScreen, T, people, useFlowPalette } from "@/components/community/freelancerFlow/shared";

type Thread = {
  id: string;
  name: string;
  message: string;
  time: string;
  lastMessageAt: string;
  unread: number;
  avatar?: string;
};

const THREADS: Thread[] = [
  {
    id: "m1",
    name: "Arjun Patel",
    message: "Perfect. Send v2 today, I’ll review by 7 PM.",
    time: "10:42 AM",
    lastMessageAt: "2026-02-24T10:42:00+05:30",
    unread: 2,
    avatar: people.alex,
  },
  {
    id: "m2",
    name: "Priya Sharma",
    message: "Yes, this works. Let’s freeze and ship this build.",
    time: "9:18 AM",
    lastMessageAt: "2026-02-24T09:18:00+05:30",
    unread: 0,
    avatar: people.sarah,
  },
  {
    id: "m3",
    name: "Nova Labs Team",
    message: "Milestone approved. Start next phase and share ETA.",
    time: "Yesterday",
    lastMessageAt: "2026-02-23T18:30:00+05:30",
    unread: 1,
    avatar: people.jordan,
  },
  {
    id: "m4",
    name: "Helio Commerce",
    message: "Can we do a quick call about timeline changes?",
    time: "Mon",
    lastMessageAt: "2026-02-22T11:05:00+05:30",
    unread: 0,
    avatar: people.david,
  },
];

export default function TalentMessagesScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? THREADS
      : THREADS.filter(
      (thread) =>
        thread.name.toLowerCase().includes(q) ||
        thread.message.toLowerCase().includes(q),
    );
    return [...base].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  }, [query]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 450);
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}>
        <T weight="medium" color={palette.text} style={styles.pageTitle}>
          Messages
        </T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
          Your recent conversations
        </T>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          <View style={[styles.search, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}>
            <Ionicons name="search" size={15} color={palette.subText} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search messages"
              placeholderTextColor={palette.subText}
              style={[styles.searchInput, { color: palette.text }]}
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={16} color={palette.subText} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.list}>
            {filtered.map((thread) => (
              <TouchableOpacity
                key={thread.id}
                style={[styles.rowPressable, { borderBottomColor: palette.borderLight }]}
                activeOpacity={0.88}
                onPress={() =>
                  router.push(
                    `/(role-pager)/(freelancer-tabs)/thread/${encodeURIComponent(thread.id)}?title=${encodeURIComponent(thread.name)}&avatar=${encodeURIComponent(thread.avatar || people.alex)}`,
                  )
                }
              >
                <View style={styles.row}>
                  <Avatar source={thread.avatar || people.alex} size={42} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>
                      {thread.name}
                    </T>
                    <T weight="regular" color={palette.subText} style={styles.message} numberOfLines={1}>
                      {thread.message}
                    </T>
                  </View>
                  <View style={styles.metaCol}>
                    <T weight="regular" color={palette.subText} style={styles.time} numberOfLines={1}>
                      {thread.time}
                    </T>
                    {thread.unread > 0 ? (
                      <View style={[styles.badge, { backgroundColor: palette.accent }]}>
                        <T weight="medium" color="#fff" style={styles.badgeText}>
                          {thread.unread}
                        </T>
                      </View>
                    ) : (
                      <View style={styles.badgeSpacer} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={30} color={palette.subText} />
              <T weight="medium" color={palette.text} style={styles.emptyTitle}>
                No messages found
              </T>
              <T weight="regular" color={palette.subText} style={styles.emptySub}>
                Try another search term.
              </T>
            </View>
          ) : null}

          <View style={{ height: tabBarHeight + 16 }} />
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 10,
  },
  search: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  list: {
    marginTop: 2,
  },
  rowPressable: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 10,
    lineHeight: 13,
  },
  message: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
  },
  metaCol: {
    width: 64,
    alignItems: "flex-end",
    gap: 6,
    paddingTop: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
  },
  badgeSpacer: {
    height: 20,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 22,
    alignItems: "center",
    marginTop: 4,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
  },
  emptySub: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
  },
});
