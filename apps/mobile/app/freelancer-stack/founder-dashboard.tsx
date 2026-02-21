import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  PrimaryButton,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";

const activeGigs = [
  {
    title: "Senior React Developer",
    sub: "Neobank App",
    status: "HIRING",
    statusTone: "danger" as const,
    metric: "12 Applications",
    avatars: [people.female1, people.female2, people.sarah],
  },
  {
    title: "UI/UX Design Audit",
    sub: "Dashboard Redesign",
    status: "IN PROGRESS",
    statusTone: "progress" as const,
    metric: "Due in 3 days",
    avatars: [people.alex],
  },
];

export default function FounderDashboardScreen() {
  const { palette, isDark } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <View style={[styles.header, { borderBottomColor: palette.border }]}> 
        <View style={styles.leftRow}>
          <Avatar source={people.alex} size={42} />
          <View>
            <T weight="semiBold" color={palette.subText} style={styles.smallLabel}>
              Founder Space
            </T>
            <T weight="bold" color={palette.text} style={styles.headerTitle}>
              Dashboard
            </T>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.bellBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
          activeOpacity={0.85}
        >
          <Ionicons name="notifications-outline" size={18} color={palette.subText} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <T weight="semiBold" color={palette.accent} style={styles.goodMorning}>
          GOOD MORNING
        </T>
        <T weight="bold" color={palette.text} style={styles.hello}>
          Hello, Alex
        </T>
        <T weight="medium" color={palette.subText} style={styles.subtitle}>
          Manage gigs, review proposals, and track contracts in one place.
        </T>

        <PrimaryButton
          label="Post a New Gig"
          icon="add"
          onPress={() => nav.push("/freelancer-stack/post-gig")}
          style={styles.cta}
        />

        <View style={styles.kpiRow}>
          <SurfaceCard style={styles.kpiCard}>
            <View style={styles.kpiHead}>
              <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>
                TOTAL SPENT
              </T>
              <Ionicons name="wallet-outline" size={16} color={palette.accent} />
            </View>
            <T weight="bold" color={palette.text} style={styles.kpiValue}>
              ₹12,450
            </T>
            <View style={styles.chipPositive}>
              <Ionicons name="trending-up" size={12} color="#1D9A5B" />
              <T weight="semiBold" color="#1D9A5B" style={styles.chipText}>
                +12%
              </T>
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.kpiCard}>
            <View style={styles.kpiHead}>
              <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>
                GIGS COMPLETED
              </T>
              <Ionicons name="checkmark-circle-outline" size={16} color={palette.accent} />
            </View>
            <T weight="bold" color={palette.text} style={styles.kpiValue}>
              18
            </T>
            <View style={[styles.chipNeutral, { backgroundColor: palette.accentSoft }]}>
              <Ionicons name="star" size={11} color={palette.accent} />
              <T weight="semiBold" color={palette.accent} style={styles.chipText}>
                Top Rated
              </T>
            </View>
          </SurfaceCard>
        </View>

        <View style={styles.sectionHead}>
          <T weight="bold" color={palette.text} style={styles.sectionTitle}>
            Active Gigs
          </T>
          <TouchableOpacity onPress={() => nav.push("/freelancer-stack/my-gigs")}> 
            <T weight="bold" color={palette.accent} style={styles.seeAll}>
              See all
            </T>
          </TouchableOpacity>
        </View>

        {activeGigs.map((gig) => (
          <SurfaceCard key={gig.title} style={styles.gigCard}>
            <View style={styles.gigTop}>
              <View style={{ flex: 1 }}>
                <T weight="bold" color={palette.text} style={styles.gigTitle}>
                  {gig.title}
                </T>
                <T weight="medium" color={palette.subText} style={styles.gigSub}>
                  {gig.sub}
                </T>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      gig.statusTone === "danger"
                        ? palette.accentSoft
                        : isDark
                          ? "rgba(70,130,255,0.18)"
                          : "rgba(70,130,255,0.12)",
                  },
                ]}
              >
                <T
                  weight="semiBold"
                  color={gig.statusTone === "danger" ? palette.accent : "#2A63F6"}
                  style={styles.badgeText}
                >
                  {gig.status}
                </T>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            <View style={styles.gigBottom}>
              <View style={styles.avatarRow}>
                {gig.avatars.map((a, i) => (
                  <View key={`${a}-${i}`} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                    <Avatar source={a} size={24} />
                  </View>
                ))}
              </View>
              <T weight="semiBold" color={palette.subText} style={styles.gigMetric}>
                {gig.metric}
              </T>
            </View>
          </SurfaceCard>
        ))}

        <T weight="bold" color={palette.text} style={[styles.sectionTitle, { marginTop: 16 }]}> 
          Recent Activity
        </T>

        <SurfaceCard style={styles.activityCard}>
          {[
            {
              title: "New proposal from Arjun Patel",
              time: "2 minutes ago",
              icon: "document-text-outline" as const,
              danger: true,
            },
            {
              title: "Contract signed by Sarah J.",
              time: "1 hour ago",
              icon: "shield-checkmark-outline" as const,
              danger: false,
            },
          ].map((item, idx) => (
            <View
              key={item.title}
              style={[
                styles.activityRow,
                idx === 0 ? { borderBottomWidth: 1, borderBottomColor: palette.border } : null,
              ]}
            >
              <View
                style={[
                  styles.activityIcon,
                  {
                    backgroundColor: item.danger
                      ? palette.accentSoft
                      : isDark
                        ? "rgba(35,160,88,0.2)"
                        : "rgba(35,160,88,0.14)",
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={item.danger ? palette.accent : "#1D9A5B"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <T weight="semiBold" color={palette.text} style={styles.activityTitle}>
                  {item.title}
                </T>
                <T weight="medium" color={palette.subText} style={styles.activityTime}>
                  {item.time}
                </T>
              </View>
            </View>
          ))}
        </SurfaceCard>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  smallLabel: { fontSize: 11, letterSpacing: 0.8 },
  headerTitle: { fontSize: 20 },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 18, paddingTop: 14 },
  goodMorning: { fontSize: 11, letterSpacing: 1.4 },
  hello: { fontSize: 27, marginTop: 4 },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 20 },
  cta: { marginTop: 14 },
  kpiRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  kpiCard: { flex: 1, padding: 12 },
  kpiHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kpiLabel: { fontSize: 10, letterSpacing: 0.7 },
  kpiValue: { fontSize: 22, marginTop: 8 },
  chipPositive: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(29,154,91,0.14)",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipNeutral: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipText: { fontSize: 11 },
  sectionHead: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 20 },
  seeAll: { fontSize: 13 },
  gigCard: { marginTop: 10, padding: 12 },
  gigTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  gigTitle: { fontSize: 17, flexShrink: 1 },
  gigSub: { fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 10, letterSpacing: 0.7 },
  divider: { height: 1, marginVertical: 10 },
  gigBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  gigMetric: { fontSize: 13 },
  activityCard: { marginTop: 10 },
  activityRow: { flexDirection: "row", gap: 10, padding: 12, alignItems: "center" },
  activityIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  activityTitle: { fontSize: 14 },
  activityTime: { fontSize: 12, marginTop: 1 },
});
