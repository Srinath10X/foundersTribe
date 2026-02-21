import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Avatar, Badge, FlowScreen, FlowTopBar, PrimaryButton, SurfaceCard, T, people, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { gigService, Gig } from "@/lib/gigService";

export default function TalentGigDetailsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGig = async () => {
      if (!id) {
        setError("No Gig ID provided");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await gigService.getGig(id);
        setGig(data);
      } catch (err: any) {
        console.error("Failed to fetch gig details:", err);
        setError(err.message || "Failed to load gig details");
      } finally {
        setLoading(false);
      }
    };

    fetchGig();
  }, [id]);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "Unknown Delivery";
    const date = new Date(dateStr);
    const diff = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Overdue";
    if (diff === 0) return "Due today";
    return `${diff} days`;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
          <T color={palette.subText} style={{ marginTop: 16 }}>Loading gig details...</T>
        </View>
      );
    }

    if (error || !gig) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <T weight="bold" color={palette.text} style={{ marginTop: 16, fontSize: 18 }}>Error Loading Gig</T>
          <T color={palette.subText} style={{ marginTop: 8, textAlign: "center", paddingHorizontal: 32 }}>{error || "Gig not found"}</T>
          <PrimaryButton label="Go Back" onPress={nav.back} style={{ marginTop: 24, paddingHorizontal: 32 }} />
        </View>
      );
    }

    const isUrgent = gig.status === "open" && gig.deadline && (new Date(gig.deadline).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000;

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.badges}>
          {isUrgent && <Badge label="Urgent" tone="danger" />}
          <Badge label={gig.status.toUpperCase()} tone="progress" />
        </View>
        <T weight="bold" color={palette.text} style={styles.title}>{gig.title}</T>

        <SurfaceCard style={styles.founderCard}>
          <Avatar source={people.alex} size={42} />
          <View style={{ flex: 1 }}>
            <T weight="bold" color={palette.text} style={styles.name}>{gig.client_name || "Client"}</T>
            <View style={styles.rateRow}>
              <Ionicons name="business" size={13} color={palette.subText} />
              <T weight="semiBold" color={palette.subText} style={styles.meta}>{gig.client_company || "Company"}</T>
            </View>
          </View>
        </SurfaceCard>

        <View style={styles.kpiRow}>
          {[
            { l: "Budget", v: `₹${gig.budget?.toLocaleString() || "..."}`, i: "wallet-outline" as const },
            { l: "Timeline", v: formatTime(gig.deadline), i: "time-outline" as const },
            { l: "Status", v: gig.status, i: "ribbon-outline" as const },
          ].map((x) => (
            <SurfaceCard key={x.l} style={styles.kpiCard}>
              <Ionicons name={x.i} size={16} color={palette.accent} />
              <T weight="semiBold" color={palette.subText} style={styles.kLabel}>{x.l}</T>
              <T weight="bold" color={palette.text} style={styles.kValue} numberOfLines={1} adjustsFontSizeToFit>{x.v}</T>
            </SurfaceCard>
          ))}
        </View>

        <SurfaceCard style={styles.block}>
          <T weight="bold" color={palette.text} style={styles.head}>Project Description</T>
          <T color={palette.subText} style={styles.body}>
            {gig.description || "No description provided format for this gig."}
          </T>
        </SurfaceCard>

        <SurfaceCard style={styles.block}>
          <T weight="bold" color={palette.text} style={styles.head}>Details</T>
          <T color={palette.subText} style={styles.body}>
            Posted: {new Date(gig.created_at).toLocaleDateString()}
          </T>
          {gig.updated_at !== gig.created_at && (
            <T color={palette.subText} style={styles.body}>
              Last Updated: {new Date(gig.updated_at).toLocaleDateString()}
            </T>
          )}
        </SurfaceCard>

        <PrimaryButton label="Send Proposal" icon="send" onPress={() => nav.push("/talent-stack/send-proposal")} />

        <TouchableOpacity style={styles.ghost} onPress={nav.back}>
          <T weight="semiBold" color={palette.subText} style={styles.meta}>Back to Browse</T>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <FlowScreen>
      <FlowTopBar title="Gig Details" onLeftPress={nav.back} right="bookmark-outline" onRightPress={() => { }} />
      {renderContent()}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, gap: 10 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  badges: { flexDirection: "row", gap: 8 },
  title: { fontSize: 24, lineHeight: 32 },
  founderCard: { padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 16 },
  rateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  meta: { fontSize: 13 },
  kpiRow: { flexDirection: "row", gap: 8 },
  kpiCard: { flex: 1, padding: 10, alignItems: "center" },
  kLabel: { fontSize: 11, marginTop: 4 },
  kValue: { fontSize: 16, marginTop: 2 },
  block: { padding: 16 },
  head: { fontSize: 18, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 12 },
  ghost: { alignItems: "center", marginTop: 4, marginBottom: 24, paddingVertical: 12 },
});
