import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { SearchAccount, searchAccounts } from "@/lib/searchService";

export default function FreelancerProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [freelancer, setFreelancer] = useState<SearchAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const results = searchAccounts("");
      const found = results.find((f) => f.id === id);
      setFreelancer(found || null);
    } else {
      setFreelancer(null);
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <FlowScreen>
        <FlowTopBar title="Profile" onLeftPress={nav.back} />
        <LoadingState rows={4} />
      </FlowScreen>
    );
  }

  if (!freelancer) {
    return (
      <FlowScreen>
        <FlowTopBar title="Profile" onLeftPress={nav.back} />
        <ErrorState
          title="Freelancer not found"
          message="The profile you're looking for doesn't exist or couldn't be loaded."
          onRetry={nav.back}
        />
      </FlowScreen>
    );
  }

  const skills = freelancer.skills ?? [];
  const ratingDisplay = freelancer.rating ? `${freelancer.rating} / 5` : "N/A";
  const rateDisplay = freelancer.hourly_rate ? `₹${freelancer.hourly_rate}/hr` : "N/A";

  return (
    <FlowScreen>
      <FlowTopBar title="Freelancer Profile" onLeftPress={nav.back} right="ellipsis-horizontal" onRightPress={() => {}} />

      <View style={styles.page}>
        <SurfaceCard style={styles.heroCard}>
          <View style={styles.head}>
            <View style={styles.avatarWrap}>
              <Avatar source={freelancer.avatar_url ? { uri: freelancer.avatar_url } : undefined} size={92} />
              <View style={[styles.online, { borderColor: palette.bg }]} />
            </View>
            <View style={styles.headText}>
              <T weight="bold" color={palette.text} style={styles.name}>{freelancer.display_name}</T>
              {freelancer.bio && (
                <T weight="semiBold" color={palette.accent} style={styles.role}>{freelancer.bio}</T>
              )}
              <View style={styles.location}>
                <Ionicons name="person-circle-outline" size={14} color={palette.subText} />
                <T weight="medium" color={palette.subText} style={styles.locationText}>@{freelancer.username}</T>
              </View>
            </View>
          </View>
        </SurfaceCard>

        <View style={styles.stats}>
          <SurfaceCard style={styles.statCard}>
            <T weight="semiBold" color={palette.subText} style={styles.statLabel}>RATING</T>
            <T weight="bold" color={palette.text} style={styles.statValue}>{ratingDisplay}</T>
          </SurfaceCard>
          <SurfaceCard style={styles.statCard}>
            <T weight="semiBold" color={palette.subText} style={styles.statLabel}>HOURLY RATE</T>
            <T weight="bold" color={palette.text} style={styles.statValue}>{rateDisplay}</T>
          </SurfaceCard>
        </View>

        {skills.length > 0 && (
          <SurfaceCard style={styles.card}>
            <T weight="bold" color={palette.text} style={styles.cardTitle}>Top Skills</T>
            <View style={styles.tags}>
              {skills.map((skill) => (
                <View key={skill} style={[styles.tag, { backgroundColor: palette.border }]}>
                  <T weight="semiBold" color={palette.subText} style={styles.tagText}>{skill}</T>
                </View>
              ))}
            </View>
          </SurfaceCard>
        )}

        {skills.length === 0 && (
          <SurfaceCard style={styles.card}>
            <EmptyState
              icon="construct-outline"
              title="No skills listed"
              subtitle="This freelancer hasn't added skills to their profile yet."
            />
          </SurfaceCard>
        )}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  heroCard: { padding: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: { position: "relative" },
  online: {
    position: "absolute",
    right: 1,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#5FA876",
    borderWidth: 2,
  },
  headText: { flex: 1 },
  name: { fontSize: 20 },
  role: { fontSize: 14, marginTop: 1 },
  location: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 12 },

  stats: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, padding: 12 },
  statLabel: { fontSize: 10, letterSpacing: 0.8 },
  statValue: { fontSize: 17, marginTop: 3 },

  card: { padding: 12 },
  cardTitle: { fontSize: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  tagText: { fontSize: 11 },
});
