import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

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
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Freelancer Profile</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>View profile details</T>
          </View>
        </View>
        <View style={styles.contentPad}><LoadingState rows={4} /></View>
      </FlowScreen>
    );
  }

  if (!freelancer) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Freelancer Profile</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>View profile details</T>
          </View>
        </View>
        <View style={styles.contentPad}>
          <ErrorState
            title="Freelancer not found"
            message="The profile you're looking for doesn't exist or couldn't be loaded."
            onRetry={nav.back}
          />
        </View>
      </FlowScreen>
    );
  }

  const skills = freelancer.skills ?? [];
  const ratingDisplay = freelancer.rating ? `${freelancer.rating} / 5` : "N/A";
  const rateDisplay = freelancer.hourly_rate ? `₹${freelancer.hourly_rate}/hr` : "N/A";

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
          <Ionicons name="arrow-back" size={15} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Freelancer Profile</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>View profile details</T>
        </View>
      </View>

      <View style={styles.contentPad}>
        <SurfaceCard style={styles.heroCard}>
          <View style={styles.head}>
            <View style={styles.avatarWrap}>
              <Avatar source={freelancer.avatar_url ? { uri: freelancer.avatar_url } : undefined} size={72} />
              <View style={[styles.online, { borderColor: palette.surface }]} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>{freelancer.display_name}</T>
              {freelancer.bio ? (
                <T weight="regular" color={palette.subText} style={styles.bio} numberOfLines={2}>{freelancer.bio}</T>
              ) : null}
              <View style={styles.usernameRow}>
                <Ionicons name="person-circle-outline" size={13} color={palette.subText} />
                <T weight="regular" color={palette.subText} style={styles.username} numberOfLines={1}>@{freelancer.username}</T>
              </View>
            </View>
          </View>
        </SurfaceCard>

        <View style={styles.statsRow}>
          <SurfaceCard style={styles.statCard}>
            <T weight="regular" color={palette.subText} style={styles.statLabel}>Rating</T>
            <T weight="medium" color={palette.text} style={styles.statValue}>{ratingDisplay}</T>
          </SurfaceCard>
          <SurfaceCard style={styles.statCard}>
            <T weight="regular" color={palette.subText} style={styles.statLabel}>Hourly Rate</T>
            <T weight="medium" color={palette.text} style={styles.statValue}>{rateDisplay}</T>
          </SurfaceCard>
        </View>

        {skills.length > 0 ? (
          <SurfaceCard style={styles.sectionCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>Top Skills</T>
            <View style={styles.tags}>
              {skills.map((skill) => (
                <View key={skill} style={[styles.tag, { backgroundColor: palette.border }]}> 
                  <T weight="regular" color={palette.subText} style={styles.tagText}>{skill}</T>
                </View>
              ))}
            </View>
          </SurfaceCard>
        ) : (
          <SurfaceCard style={styles.sectionCard}>
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
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  pageSubtitle: { marginTop: 1, fontSize: 12, lineHeight: 16 },
  contentPad: { paddingHorizontal: 18, paddingTop: 14, gap: 8 },
  heroCard: { padding: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: { position: "relative" },
  online: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: "#5FA876",
  },
  name: { fontSize: 14, lineHeight: 19 },
  bio: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  usernameRow: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  username: { fontSize: 11, lineHeight: 14 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, padding: 10 },
  statLabel: { fontSize: 10, lineHeight: 13 },
  statValue: { marginTop: 4, fontSize: 13, lineHeight: 17 },
  sectionCard: { padding: 12 },
  sectionTitle: { fontSize: 13, lineHeight: 17 },
  tags: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 10, lineHeight: 13 },
});
