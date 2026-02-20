import { Layout } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";
import { useArticleInteractions } from "@/hooks/useArticleInteractions";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: windowWidth } = Dimensions.get("window");
const REEL_WIDTH =
  Platform.OS === "web"
    ? Math.min(windowWidth, Layout.webMaxWidth)
    : windowWidth;

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

interface ArticleReelCardProps {
  article: Article;
  height?: number;
  bottomInset?: number;
}

export function ArticleReelCard({
  article,
  height,
  bottomInset = 48,
}: ArticleReelCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { liked, bookmarked, toggleLike, toggleBookmark } =
    useArticleInteractions(article.id);
  const [imageLoading, setImageLoading] = useState(true);

  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
  const contentBottom = useSharedValue(bottomInset);

  useEffect(() => {
    contentBottom.value = withTiming(bottomInset, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [bottomInset, contentBottom]);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleOpenArticle = () => {
    triggerHaptic();
    router.push({
      pathname: "/article/[id]",
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

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));
  const bookmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));
  const shareAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));
  const contentShiftStyle = useAnimatedStyle(() => ({
    bottom: contentBottom.value,
  }));

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background, height }]}
    >
      {/* Full-bleed background image */}
      <View style={styles.cardVisual}>
        <Image
          source={{
            uri:
              article["Image URL"] ||
              "https://images.unsplash.com/photo-1541560052-5e137f229371",
          }}
          style={styles.visualImg}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
          onLoadEnd={() => setImageLoading(false)}
        />
        {/* Dark scrim for text readability */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.70)", "rgba(0,0,0,0.85)"]}
          style={styles.imageOverlay}
          start={{ x: 0, y: 0.25 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      {imageLoading && (
        <View style={[styles.loadingSkeleton, { backgroundColor: "#000" }]}>
          <ActivityIndicator size="large" color="#FF3B30" />
        </View>
      )}

      {/* Content + Actions */}
      <View style={styles.contentWrapper}>
        <Animated.View style={[styles.columnContainer, contentShiftStyle]}>
          {/* Left: Text */}
          <View style={styles.leftColumn}>
            {/* Category */}
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>
                {article.Category || "NEWS"}
              </Text>
            </View>

            {/* Title */}
            <TouchableOpacity activeOpacity={0.9} onPress={handleOpenArticle}>
              <Text style={styles.cardTitle} numberOfLines={3}>
                {article.Title}
              </Text>
            </TouchableOpacity>

            {/* Summary */}
            <TouchableOpacity activeOpacity={0.9} onPress={handleOpenArticle}>
              <Text style={styles.cardSummary} numberOfLines={2}>
                {article.Summary || article.Content}
                <Text style={styles.moreText}> ... more</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Right: Actions */}
          <View style={styles.rightColumn}>
            <View style={styles.actionItem}>
              <TouchableOpacity onPress={handleLike} style={styles.iconBtn}>
                <Animated.View style={likeAnimatedStyle}>
                  <MaterialIcons
                    name={liked ? "favorite" : "favorite-outline"}
                    size={30}
                    color={liked ? "#FF3B30" : "#FFFFFF"}
                  />
                </Animated.View>
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Like</Text>
            </View>

            <View style={styles.actionItem}>
              <TouchableOpacity onPress={handleBookmark} style={styles.iconBtn}>
                <Animated.View style={bookmarkAnimatedStyle}>
                  <MaterialIcons
                    name={bookmarked ? "bookmark" : "bookmark-outline"}
                    size={30}
                    color={bookmarked ? "#FF3B30" : "#FFFFFF"}
                  />
                </Animated.View>
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Save</Text>
            </View>

            <View style={styles.actionItem}>
              <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                <Animated.View style={shareAnimatedStyle}>
                  <MaterialIcons name="share" size={28} color="#FFFFFF" />
                </Animated.View>
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Share</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: REEL_WIDTH,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000",
  },

  cardVisual: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  visualImg: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  loadingSkeleton: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },

  contentWrapper: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  columnContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  leftColumn: {
    flex: 1,
    paddingBottom: 8,
  },
  categoryPill: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 6,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardSummary: {
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Poppins_400Regular",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  moreText: {
    color: "#FF3B30",
    fontWeight: "bold",
  },

  rightColumn: {
    width: 56,
    alignItems: "center",
    gap: 20,
    paddingBottom: 8,
  },
  actionItem: {
    alignItems: "center",
    gap: 2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
