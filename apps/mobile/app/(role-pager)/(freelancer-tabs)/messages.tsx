import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { Avatar, FlowScreen, T, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { useContracts } from "@/hooks/useGig";

function formatTimeLabel(value: string) {
  const d = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function TalentMessagesScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [query, setQuery] = useState("");

  const { data, isRefetching, refetch } = useContracts({ limit: 100 });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.items || []).map((contract) => {
      const participantName = contract.founder?.full_name || "Founder";
      const message = contract.gig?.title || "Contract conversation";
      return {
        id: contract.id,
        name: participantName,
        message,
        time: formatTimeLabel(contract.updated_at),
        lastMessageAt: contract.updated_at,
        avatar: contract.founder?.avatar_url || undefined,
      };
    });

    const searched = !q
      ? list
      : list.filter(
          (thread) =>
            thread.name.toLowerCase().includes(q) ||
            thread.message.toLowerCase().includes(q),
        );

    return searched.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  }, [data?.items, query]);

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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={palette.accent} />}
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
                    `/(role-pager)/(freelancer-tabs)/thread/${encodeURIComponent(thread.id)}?title=${encodeURIComponent(thread.name)}&avatar=${encodeURIComponent(thread.avatar || "")}`,
                  )
                }
              >
                <View style={styles.row}>
                  <Avatar source={thread.avatar || undefined} size={42} />
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
