import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";

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
import { SearchAccount, searchAccounts } from "@/lib/searchService";

const mockSkills: Record<string, string[]> = {
  "1": ["React", "Node.js", "PostgreSQL", "WebSockets", "TypeScript"],
  "2": ["Product Management", "Strategy", "SaaS", "Growth"],
  "3": ["Python", "Machine Learning", "TensorFlow", "Data Analysis"],
  "4": ["Sales", "Growth", "B2B", "Fundraising"],
  "5": ["Frontend Developer", "React", "Vue.js", "CSS", "JavaScript"],
  "6": ["UI Design", "Figma", "User Research", "Frontend Developer"],
  "7": ["React Native", "Mobile Development", "iOS", "Android"],
  "8": ["Backend", "PostgreSQL", "AWS", "Docker"],
};

const mockOutcomes: Record<string, string[]> = {
  "1": ["Launched 14 production apps", "Reduced API latency by 35%", "Improved retention by 22%"],
  "2": ["Scaled 3 startups from 0 to $1M ARR", "Built teams of 20+ engineers", "Raised $50M+ in funding"],
  "3": ["Built 10+ ML models in production", "Improved model accuracy by 40%", "Deployed models at scale"],
  "4": ["Generated $10M+ in pipeline", "Closed 50+ enterprise deals", "Built sales playbook"],
  "5": ["Built 20+ responsive websites", "Improved page load by 60%", "Implemented design systems"],
  "6": ["Designed 30+ mobile apps", "Increased user engagement by 45%", "Created design systems"],
  "7": ["Shipped 15+ mobile apps", "4.8+ star ratings on App Store", "100K+ downloads"],
  "8": ["Architected 10+ scalable systems", "Reduced infrastructure costs by 30%", "99.9% uptime"],
};

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

  const skills = (id && mockSkills[id]) || ["React Native", "Node.js", "PostgreSQL", "WebSockets", "TypeScript"];
  const outcomes = (id && mockOutcomes[id]) || [
    "Launched 14 production apps",
    "Reduced API latency by 35%",
    "Improved retention by 22%",
  ];

  if (loading) {
    return (
      <FlowScreen>
        <FlowTopBar title="Profile" onLeftPress={nav.back} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      </FlowScreen>
    );
  }

  if (!freelancer) {
    return (
      <FlowScreen>
        <FlowTopBar title="Profile" onLeftPress={nav.back} />
        <View style={styles.loadingWrap}>
          <T weight="semiBold" color={palette.subText}>Freelancer not found</T>
        </View>
      </FlowScreen>
    );
  }

  const mockNames: Record<string, string> = {
    "1": "Sarah Chen",
    "2": "Alex Rivera",
    "3": "Priya Sharma",
    "4": "James Wu",
    "5": "Michael Torres",
    "6": "Emma Wilson",
    "7": "David Kim",
    "8": "Lisa Johnson",
  };

  const mockRoles: Record<string, string> = {
    "1": "Full Stack Developer",
    "2": "Product & Growth Lead",
    "3": "AI/ML Engineer",
    "4": "Business Strategist",
    "5": "Frontend Developer",
    "6": "UI/UX Designer",
    "7": "Mobile Developer",
    "8": "Backend Engineer",
  };

  return (
    <FlowScreen>
      <FlowTopBar title="Freelancer Profile" onLeftPress={nav.back} right="ellipsis-horizontal" onRightPress={() => {}} />

      <View style={styles.page}>
        <SurfaceCard style={styles.heroCard}>
          <View style={styles.head}>
            <View style={styles.avatarWrap}>
              <Avatar source={freelancer.avatar_url ? { uri: freelancer.avatar_url } : people.alex} size={92} />
              <View style={[styles.online, { borderColor: palette.bg }]} />
            </View>
            <View style={styles.headText}>
              <T weight="bold" color={palette.text} style={styles.name}>{mockNames[freelancer.id] || freelancer.display_name}</T>
              <T weight="semiBold" color={palette.accent} style={styles.role}>{mockRoles[freelancer.id] || "Freelancer"}</T>
              <View style={styles.location}><Ionicons name="location" size={14} color={palette.subText} /><T weight="medium" color={palette.subText} style={styles.locationText}>Bengaluru, KA</T></View>
            </View>
          </View>

        </SurfaceCard>

        <View style={styles.stats}>
          <SurfaceCard style={styles.statCard}>
            <T weight="semiBold" color={palette.subText} style={styles.statLabel}>RATING</T>
            <T weight="bold" color={palette.text} style={styles.statValue}>{freelancer.rating || "4.8"} / 5</T>
            <T weight="medium" color={palette.subText} style={styles.statSub}>48 completed gigs</T>
          </SurfaceCard>
          <SurfaceCard style={styles.statCard}>
            <T weight="semiBold" color={palette.subText} style={styles.statLabel}>HOURLY RATE</T>
            <T weight="bold" color={palette.text} style={styles.statValue}>₹{freelancer.hourly_rate || "75"}/hr</T>
            <T weight="medium" color={palette.subText} style={styles.statSub}>Available this week</T>
          </SurfaceCard>
        </View>

        <SurfaceCard style={styles.card}>
          <T weight="bold" color={palette.text} style={styles.cardTitle}>Top Skills</T>
          <View style={styles.tags}>
            {(freelancer.skills || skills).map((skill) => (
              <View key={skill} style={[styles.tag, { backgroundColor: palette.border }]}>
                <T weight="semiBold" color={palette.subText} style={styles.tagText}>{skill}</T>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <T weight="bold" color={palette.text} style={styles.cardTitle}>Recent Outcomes</T>
          {outcomes.map((item) => (
            <View key={item} style={styles.row}>
              <Ionicons name="checkmark-circle" size={16} color={palette.accent} />
              <T weight="medium" color={palette.subText} style={styles.rowText}>{item}</T>
            </View>
          ))}
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <View style={styles.reviewHead}>
            <T weight="bold" color={palette.text} style={styles.cardTitle}>Client Review</T>
            <T weight="bold" color={palette.accent} style={styles.stars}>★★★★★</T>
          </View>
          <T color={palette.text} style={styles.reviewText}>
            "Great work! The freelancer delivered exceptional quality and communication was consistent throughout the project."
          </T>
          <View style={styles.clientRow}>
            <Avatar source={people.marcus} size={28} />
            <T weight="medium" color={palette.subText} style={styles.clientName}>Marcus Thorne, Founder at ShopHub</T>
          </View>
        </SurfaceCard>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  statSub: { fontSize: 11, marginTop: 2 },

  card: { padding: 12 },
  cardTitle: { fontSize: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  tagText: { fontSize: 11 },

  row: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  rowText: { fontSize: 13, flex: 1 },

  reviewHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stars: { fontSize: 12 },
  reviewText: { marginTop: 8, fontSize: 13, lineHeight: 19 },
  clientRow: { marginTop: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  clientName: { fontSize: 12 },
});
