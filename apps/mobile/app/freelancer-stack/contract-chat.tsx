import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useContracts } from "@/hooks/useGig";
import type { Contract } from "@/types/gig";

export default function ContractChatScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  const { data, isLoading, error, refetch, isRefetching } = useContracts();
  const contracts = data?.items ?? [];

  const getOtherParty = (contract: Contract) => {
    const freelancer = contract.freelancer;
    return {
      name: freelancer?.full_name || freelancer?.handle || "Freelancer",
      avatar: freelancer?.avatar_url || undefined,
      role: freelancer?.bio?.substring(0, 32) || "Freelancer",
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString("en-IN", { weekday: "short" });
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <T weight="medium" color={palette.text} style={styles.pageTitle}>Messages</T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Contract conversations</T>
      </View>

      {isLoading ? (
        <View style={styles.contentPad}>
          <LoadingState rows={4} />
        </View>
      ) : error ? (
        <View style={styles.contentPad}>
          <ErrorState title="Failed to load conversations" message={error.message} onRetry={() => refetch()} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={palette.accent} />}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentPad}>
            {contracts.length === 0 ? (
              <EmptyState
                icon="chatbubble-outline"
                title="No Conversations"
                subtitle="Start a contract with a freelancer to begin chatting."
              />
            ) : (
              <View style={styles.stack}>
                {contracts.map((contract) => {
                  const other = getOtherParty(contract);
                  const gigTitle = contract.gig?.title || "Contract";
                  const isActive = contract.status === "active";

                  return (
                    <TouchableOpacity
                      key={contract.id}
                      activeOpacity={0.86}
                      onPress={() =>
                        nav.push(
                          `/freelancer-stack/contract-chat-thread?contractId=${contract.id}&title=${encodeURIComponent(other.name)}`,
                        )
                      }
                    >
                      <SurfaceCard style={[styles.card, isActive ? { borderColor: `${palette.accent}33` } : null]}>
                        <View style={styles.row}>
                          <View style={styles.avatarWrap}>
                            <Avatar source={other.avatar ? { uri: other.avatar } : undefined} size={42} />
                            {isActive ? <View style={[styles.onlineDot, { borderColor: palette.surface }]} /> : null}
                          </View>

                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={styles.nameRow}>
                              <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>
                                {other.name}
                              </T>
                              <T weight="regular" color={palette.subText} style={styles.time}>{formatDate(contract.updated_at)}</T>
                            </View>

                            <T weight="regular" color={palette.accent} style={styles.gigTitle} numberOfLines={1}>
                              {gigTitle}
                            </T>

                            <View style={styles.subRow}>
                              <T weight="regular" color={palette.subText} style={styles.statusText} numberOfLines={1}>
                                {contract.status === "active"
                                  ? "Contract in progress"
                                  : contract.status === "completed"
                                    ? "Contract completed"
                                    : `Contract ${contract.status}`}
                              </T>
                              {isActive ? (
                                <View style={[styles.badge, { backgroundColor: palette.accent }]}>
                                  <Ionicons name="chatbubble" size={9} color="#fff" />
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      </SurfaceCard>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
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
  pageTitle: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  pageSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  scrollContent: { paddingBottom: 100 },
  contentPad: { paddingHorizontal: 18, paddingTop: 14 },
  stack: { gap: 8 },
  card: { padding: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: { position: "relative" },
  onlineDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: "#34C759",
  },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 13, lineHeight: 17 },
  time: { fontSize: 10, lineHeight: 13 },
  gigTitle: { marginTop: 2, fontSize: 11, lineHeight: 14 },
  subRow: { marginTop: 3, flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { flex: 1, fontSize: 11, lineHeight: 14 },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
});
