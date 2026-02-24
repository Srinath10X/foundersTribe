import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  people,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

type GigStatus = "open" | "in_progress" | "completed";
type GigLevel = "entry" | "intermediate" | "expert";

type GigDetailItem = {
  id: string;
  title: string;
  company: string;
  budget: string;
  timeline: string;
  status: GigStatus;
  level: GigLevel;
  remote: boolean;
  description: string;
  deliverables: string[];
  skills: string[];
  postedAt: string;
  ownerName: string;
  ownerAvatar: string;
};

const DUMMY_GIG_DETAILS: GigDetailItem[] = [
  {
    id: "gig-1",
    title: "React Native UI Polish",
    company: "Nova Labs",
    budget: "₹25,000",
    timeline: "2 weeks",
    status: "open",
    level: "intermediate",
    remote: true,
    description:
      "Refine existing mobile screens, align spacing and typography, and improve interaction polish across dashboard, messages, and profile flows.",
    deliverables: [
      "Pixel-consistent UI updates across 8 screens",
      "Reusable typography and component style cleanup",
      "Final QA pass with dark/light theme checks",
    ],
    skills: ["React Native", "TypeScript", "UI Systems", "Expo"],
    postedAt: "2 days ago",
    ownerName: "Ananya Rao",
    ownerAvatar: people.female1,
  },
  {
    id: "gig-2",
    title: "Founder Community App QA",
    company: "TribeBase",
    budget: "₹18,000",
    timeline: "10 days",
    status: "open",
    level: "entry",
    remote: true,
    description:
      "Run structured QA for profile edit, tribe joins, and message thread navigation with reproducible issue reports.",
    deliverables: [
      "Regression checklist",
      "Bug report with screenshots and repro steps",
      "Verification pass after fixes",
    ],
    skills: ["Manual QA", "Mobile Testing", "Issue Reporting"],
    postedAt: "today",
    ownerName: "Kiran Mehta",
    ownerAvatar: people.alex,
  },
  {
    id: "gig-3",
    title: "Payments Integration (Node + Stripe)",
    company: "Helio Commerce",
    budget: "₹42,000",
    timeline: "3 weeks",
    status: "in_progress",
    level: "expert",
    remote: true,
    description:
      "Implement Stripe checkout and webhook flows with secure backend handling, retries, and payment status synchronization.",
    deliverables: [
      "Checkout and payment intent flow",
      "Webhook processing and retry handling",
      "Deployment-ready setup docs",
    ],
    skills: ["Node.js", "Stripe", "Webhooks", "PostgreSQL"],
    postedAt: "5 days ago",
    ownerName: "David Clark",
    ownerAvatar: people.david,
  },
  {
    id: "gig-4",
    title: "Landing Page Performance Audit",
    company: "Raymond Studio",
    budget: "₹12,000",
    timeline: "1 week",
    status: "completed",
    level: "intermediate",
    remote: false,
    description:
      "Audit performance bottlenecks and provide prioritized fixes to improve Core Web Vitals and loading consistency.",
    deliverables: [
      "Performance audit summary",
      "Prioritized optimization roadmap",
      "Before/after benchmark snapshot",
    ],
    skills: ["Web Performance", "Lighthouse", "Frontend Optimization"],
    postedAt: "1 week ago",
    ownerName: "Marcus Hill",
    ownerAvatar: people.marcus,
  },
];

function statusLabel(status: GigStatus) {
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  return "Open";
}

export default function GigDetailsScreen() {
  const router = useRouter();
  const { palette } = useFlowPalette();
  const tabBarHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams<{ id?: string }>();
  const resolvedId = Array.isArray(params.id) ? params.id[0] : params.id;

  const item = useMemo(() => {
    const byId = DUMMY_GIG_DETAILS.find((gig) => gig.id === resolvedId);
    return byId || DUMMY_GIG_DETAILS[0];
  }, [resolvedId]);

  const statusTone =
    item.status === "completed"
      ? palette.subText
      : item.status === "in_progress"
        ? "#F59E0B"
        : palette.accent;
  const statusBg =
    item.status === "completed"
      ? palette.borderLight
      : item.status === "in_progress"
        ? "rgba(245,158,11,0.14)"
        : palette.accentSoft;

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}>
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={17} color={palette.text} />
        </TouchableOpacity>

        <T weight="medium" color={palette.text} style={styles.headerTitle} numberOfLines={1}>
          Gig Details
        </T>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <LinearGradient
            colors={[palette.accentSoft, palette.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: palette.borderLight }]}
          >
            <View style={styles.heroTopRow}>
              <View style={[styles.pill, { backgroundColor: statusBg }]}> 
                <T weight="medium" color={statusTone} style={styles.pillText}>
                  {statusLabel(item.status)}
                </T>
              </View>
              <View style={[styles.pill, { backgroundColor: palette.borderLight }]}> 
                <T weight="regular" color={palette.subText} style={styles.pillText}>
                  {item.level}
                </T>
              </View>
            </View>

            <T weight="medium" color={palette.text} style={styles.gigTitle}>
              {item.title}
            </T>
            <T weight="regular" color={palette.subText} style={styles.gigCompany}>
              {item.company}
            </T>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={13} color={palette.subText} />
                <T weight="regular" color={palette.subText} style={styles.metaText}>
                  {item.budget}
                </T>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color={palette.subText} />
                <T weight="regular" color={palette.subText} style={styles.metaText}>
                  {item.timeline}
                </T>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name={item.remote ? "globe-outline" : "business-outline"} size={13} color={palette.subText} />
                <T weight="regular" color={palette.subText} style={styles.metaText}>
                  {item.remote ? "Remote" : "On-site"}
                </T>
              </View>
            </View>
          </LinearGradient>

          <SurfaceCard style={styles.card}>
            <View style={styles.ownerRow}>
              <Avatar source={item.ownerAvatar} size={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.ownerName} numberOfLines={1}>
                  {item.ownerName}
                </T>
                <T weight="regular" color={palette.subText} style={styles.ownerMeta} numberOfLines={1}>
                  {item.company} • Posted {item.postedAt}
                </T>
              </View>
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Project Overview
            </T>
            <T weight="regular" color={palette.subText} style={styles.sectionBody}>
              {item.description}
            </T>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Deliverables
            </T>
            <View style={styles.listWrap}>
              {item.deliverables.map((task) => (
                <View key={task} style={styles.listRow}>
                  <View style={[styles.listDot, { backgroundColor: palette.accent }]} />
                  <T weight="regular" color={palette.subText} style={styles.listText}>
                    {task}
                  </T>
                </View>
              ))}
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Skills Needed
            </T>
            <View style={styles.skillWrap}>
              {item.skills.map((tag) => (
                <View key={tag} style={[styles.skillTag, { backgroundColor: palette.borderLight }]}> 
                  <T weight="regular" color={palette.subText} style={styles.skillText}>
                    {tag}
                  </T>
                </View>
              ))}
            </View>
          </SurfaceCard>

          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.primaryBtn, { backgroundColor: palette.accent }]}
            onPress={() =>
              item.status === "open"
                ? router.push(
                    `/(role-pager)/(freelancer-tabs)/send-proposal?id=${encodeURIComponent(item.id)}&title=${encodeURIComponent(item.title)}&company=${encodeURIComponent(item.company)}&budget=${encodeURIComponent(item.budget)}&timeline=${encodeURIComponent(item.timeline)}` as any,
                  )
                : router.push(
                    `/(role-pager)/(freelancer-tabs)/contract-details?id=${encodeURIComponent(item.id)}&title=${encodeURIComponent(item.title)}&client=${encodeURIComponent(item.company)}&due=${encodeURIComponent(item.timeline)}` as any,
                  )
            }
          >
            <T weight="medium" color="#fff" style={styles.primaryText}>
              {item.status === "open" ? "Send Proposal" : "View Submission"}
            </T>
          </TouchableOpacity>

          <View style={{ height: tabBarHeight + 18 }} />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 10,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: "capitalize",
  },
  gigTitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  gigCompany: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    padding: 14,
    borderRadius: 14,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ownerName: {
    fontSize: 14,
    lineHeight: 19,
  },
  ownerMeta: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  sectionBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  listWrap: {
    marginTop: 8,
    gap: 7,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  listText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  skillWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skillText: {
    fontSize: 12,
    lineHeight: 16,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 14,
    lineHeight: 18,
  },
});
