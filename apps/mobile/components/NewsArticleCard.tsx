import { useTheme } from "@/context/ThemeContext";
import { useArticleInteractions } from "@/hooks/useArticleInteractions";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

interface Article {
  id: number;
  Title: string;
  Content: string | null;
  "Image URL": string | null;
  "Company Name": string | null;
  "Article Link": string | null;
  Category: string | null;
  Summary: string | null;
}

interface NewsArticleCardProps {
  article: Article;
  isForYou?: boolean;
}

/** Map a category string to a gradient color pair for the image area */
function categoryGradient(cat: string | null): [string, string] {
  const c = (cat || "").toLowerCase();
  if (c.includes("bank") || c.includes("fintech") || c.includes("finance"))
    return ["#2A1215", "#1A0A0C"];
  if (c.includes("ai") || c.includes("machine") || c.includes("deep"))
    return ["#0A1628", "#060E1A"];
  if (c.includes("crypto") || c.includes("web3") || c.includes("blockchain"))
    return ["#1A1A0A", "#0E0E06"];
  if (c.includes("health") || c.includes("bio") || c.includes("med"))
    return ["#0A1A14", "#060E0A"];
  if (c.includes("climate") || c.includes("energy") || c.includes("green"))
    return ["#0A1A0F", "#061008"];
  if (c.includes("space") || c.includes("aero"))
    return ["#12101A", "#0A080E"];
  return ["#141418", "#0E0E12"];
}

export function NewsArticleCard({
  article,
  isForYou = false,
}: NewsArticleCardProps) {
  const { isDark } = useTheme();
  const router = useRouter();
  const { liked, bookmarked, toggleLike, toggleBookmark } =
    useArticleInteractions(article.id);

  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);
  const shareScale = useSharedValue(1);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePress = () => {
    triggerHaptic();
    router.push({
      pathname: isForYou ? "/article_copy/[id]" : "/article/[id]",
      params: {
        id: article.id.toString(),
        title: article.Title,
        summary: article.Summary || article.Content || "",
        content: article.Content || article.Summary || "",
        imageUrl: article["Image URL"] || "",
        articleLink: article["Article Link"] || "",
        category: article.Category || "",
        companyName: article["Company Name"] || "",
      },
    });
  };

  const handleLike = () => {
    triggerHaptic();
    likeScale.value = withSequence(withSpring(1.4), withSpring(1));
    try {
      toggleLike();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBookmark = () => {
    triggerHaptic();
    bookmarkScale.value = withSequence(withSpring(1.4), withSpring(1));
    try {
      toggleBookmark();
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    triggerHaptic();
    shareScale.value = withSequence(
      withSpring(1.3, { damping: 8 }),
      withSpring(1, { damping: 8 })
    );
    try {
      const shareUrl = article["Article Link"];
      await Share.share({
        message: shareUrl
          ? `${article.Title}\n\n${shareUrl}`
          : `${article.Title}\n\nRead more on foundersTribe`,
        url: shareUrl || undefined,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const likeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));
  const bookmarkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));
  const shareAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));

  const category = article.Category || "News";
  const imageUrl = article["Image URL"];
  const timeAgo = "4d ago";
  const [gradStart] = categoryGradient(article.Category);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={[styles.card, { backgroundColor: isDark ? "#151517" : "#FFFFFF" }]}
    >
      {/* ── Image area ── */}
      <View
        style={[
          styles.imageArea,
          { backgroundColor: gradStart },
        ]}
      >
        {/* Category badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>
            {category.toUpperCase()}
          </Text>
        </View>

        {/* Centered image */}
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.articleImage}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : null}
      </View>

      {/* ── Content area ── */}
      <View style={styles.content}>
        {/* Title */}
        <Text
          style={[styles.title, { color: isDark ? "#FFFFFF" : "#1A1A1B" }]}
          numberOfLines={2}
        >
          {article.Title}
        </Text>

        {/* Summary */}
        {(article.Summary || article.Content) && (
          <Text
            style={[styles.summary, { color: isDark ? "#999" : "#666" }]}
            numberOfLines={2}
          >
            {article.Summary || article.Content}
          </Text>
        )}

        {/* Footer: meta + actions */}
        <View style={styles.footer}>
          <Text style={[styles.metaText, { color: isDark ? "#666" : "#999" }]}>
            {timeAgo}
            <Text> · </Text>
            {category}
          </Text>

          <View style={styles.actionsRow}>
            {/* Like */}
            <TouchableOpacity
              onPress={handleLike}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtn}
            >
              <Animated.View style={[styles.actionInner, likeAnimStyle]}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={18}
                  color={liked ? "#FF3B30" : isDark ? "#777" : "#999"}
                />
              </Animated.View>
            </TouchableOpacity>

            {/* Bookmark */}
            <TouchableOpacity
              onPress={handleBookmark}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtn}
            >
              <Animated.View style={bookmarkAnimStyle}>
                <Ionicons
                  name={bookmarked ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={bookmarked ? "#FF3B30" : isDark ? "#777" : "#999"}
                />
              </Animated.View>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtn}
            >
              <Animated.View style={shareAnimStyle}>
                <Ionicons
                  name="share-outline"
                  size={18}
                  color={isDark ? "#777" : "#999"}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 14,
  },

  /* Image area */
  imageArea: {
    height: 180,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  categoryBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "#E8391C",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 2,
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.8,
  },
  articleImage: {
    ...StyleSheet.absoluteFillObject,
  },

  /* Content area */
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  summary: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    lineHeight: 19,
  },

  /* Footer */
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionBtn: {
    padding: 2,
  },
  actionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
