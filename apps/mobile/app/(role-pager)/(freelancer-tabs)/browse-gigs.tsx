import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { Badge, FlowScreen, FlowTopBar, SurfaceCard, T, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

const gigs = [
  { title: "Senior Mobile Developer", loc: "San Francisco / Remote", time: "2h ago", tags: ["Swift", "Firebase", "CI/CD"], budget: "$5,000 - $8,000", urgent: true },
  { title: "Logo Design for Fintech", loc: "Worldwide", time: "5h ago", tags: ["Illustrator", "Branding"], budget: "$500", urgent: false },
  { title: "React Frontend Architect", loc: "London / Remote", time: "12h ago", tags: ["Next.js", "Tailwind", "TypeScript"], budget: "$80 - $120/hr", urgent: true },
];

export default function BrowseGigsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <FlowTopBar title="Browse Gigs" showLeft={false} right="options-outline" onRightPress={() => {}} />

      <View style={styles.content}>
        <View style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}> 
          <Ionicons name="search" size={16} color={palette.subText} />
          <TextInput placeholder="Search gigs" placeholderTextColor={palette.subText} style={[styles.input, { color: palette.text }]} />
        </View>

        {gigs.map((gig) => (
          <SurfaceCard key={gig.title} style={styles.card}>
            <View style={styles.cardHead}>
              {gig.urgent ? <Badge label="Urgent" tone="danger" /> : <View />}
              <TouchableOpacity>
                <Ionicons name="bookmark-outline" size={18} color={palette.subText} />
              </TouchableOpacity>
            </View>

            <T weight="bold" color={palette.text} style={styles.title}>{gig.title}</T>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={palette.subText} />
              <T weight="medium" color={palette.subText} style={styles.meta}>{gig.loc}</T>
              <T weight="medium" color={palette.subText} style={styles.meta}>• {gig.time}</T>
            </View>

            <View style={styles.tags}>
              {gig.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: palette.border }]}> 
                  <T weight="medium" color={palette.subText} style={styles.tagText}>{tag}</T>
                </View>
              ))}
            </View>

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            <View style={styles.bottom}>
              <View>
                <T weight="semiBold" color={palette.subText} style={styles.label}>BUDGET</T>
                <T weight="bold" color={palette.accent} style={styles.price}>{gig.budget}</T>
              </View>
              <TouchableOpacity style={[styles.btn, { backgroundColor: palette.accent }]} onPress={() => nav.push("/talent-stack/gig-details")}> 
                <T weight="bold" color="#fff" style={styles.btnText}>View Details</T>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        ))}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  search: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, fontFamily: "Poppins_500Medium", fontSize: 14 },
  card: { padding: 12 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 19, marginTop: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  meta: { fontSize: 13 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  tagText: { fontSize: 11 },
  divider: { height: 1, marginVertical: 10 },
  bottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 10, letterSpacing: 0.8 },
  price: { fontSize: 22, marginTop: 2 },
  btn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  btnText: { fontSize: 14 },
});
