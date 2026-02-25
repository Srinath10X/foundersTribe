import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { Avatar, SurfaceCard, T, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import type { Testimonial } from "@/types/gig";

function displayName(item: Testimonial) {
  return item.reviewer?.full_name || item.reviewer?.handle || "Member";
}

function firstLetter(value: string) {
  const clean = value.trim();
  return clean.length > 0 ? clean.charAt(0).toUpperCase() : "U";
}

function dateLabel(value?: string | null) {
  if (!value) return "";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "";
  return new Date(ts).toLocaleDateString();
}

function reviewerAvatarSource(item: Testimonial) {
  const raw = String(item.reviewer?.avatar_url || "").trim();
  if (!raw) return undefined;
  return /^https?:\/\//i.test(raw) ? raw : undefined;
}

export function TestimonialCarousel({
  title = "Testimonials",
  items,
  emptyText = "No testimonials yet.",
}: {
  title?: string;
  items: Testimonial[];
  emptyText?: string;
}) {
  const { palette } = useFlowPalette();

  return (
    <SurfaceCard style={styles.sectionCard}>
      <T weight="medium" color={palette.text} style={styles.sectionTitle}>
        {title}
      </T>

      {items.length === 0 ? (
        <T weight="regular" color={palette.subText} style={styles.emptyText}>
          {emptyText}
        </T>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          horizontal
          decelerationRate="fast"
          snapToAlignment="start"
          snapToInterval={288}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          renderItem={({ item }) => {
            const reviewer = displayName(item);
            const avatarSource = reviewerAvatarSource(item);
            const gigTitle = item.contract?.gig?.title || "Project";
            return (
              <View
                style={[
                  styles.itemCard,
                  { borderColor: palette.borderLight, backgroundColor: palette.surface },
                ]}
              >
                <View style={styles.headRow}>
                  <View style={styles.personRow}>
                    {avatarSource ? (
                      <Avatar source={avatarSource} size={30} />
                    ) : (
                      <View style={[styles.initial, { backgroundColor: palette.accentSoft }]}>
                        <T weight="medium" color={palette.accent} style={styles.initialText}>
                          {firstLetter(reviewer)}
                        </T>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T weight="medium" color={palette.text} style={styles.reviewer} numberOfLines={1}>
                        {reviewer}
                      </T>
                      <T weight="regular" color={palette.subText} style={styles.meta} numberOfLines={1}>
                        {gigTitle}
                      </T>
                    </View>
                  </View>
                  <T weight="regular" color={palette.subText} style={styles.meta}>
                    {dateLabel(item.created_at)}
                  </T>
                </View>

                <View style={styles.starRow}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Ionicons
                      key={`${item.id}-star-${index}`}
                      name={index < Number(item.score || 0) ? "star" : "star-outline"}
                      size={13}
                      color={index < Number(item.score || 0) ? "#F4C430" : palette.subText}
                    />
                  ))}
                </View>

                <T weight="regular" color={palette.text} style={styles.review} numberOfLines={4}>
                  {item.review_text || "Great collaboration and delivery."}
                </T>
              </View>
            );
          }}
        />
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    padding: 14,
    borderRadius: 14,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 15,
  },
  row: {
    marginTop: 10,
    paddingRight: 6,
    gap: 8,
  },
  itemCard: {
    width: 280,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 7,
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  initial: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  initialText: {
    fontSize: 12,
    lineHeight: 15,
  },
  reviewer: {
    fontSize: 12,
    lineHeight: 16,
  },
  meta: {
    fontSize: 10,
    lineHeight: 13,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  review: {
    fontSize: 11,
    lineHeight: 16,
  },
});
