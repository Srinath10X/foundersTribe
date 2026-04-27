import { useTheme } from "@/context/ThemeContext";
import { useArticleInteractions } from "@/hooks/useArticleInteractions";
import { shareArticle } from "@/lib/articleShare";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
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
  cardHeight: number;
}

const cleanText = (value: string | null | undefined) => {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const getImageRatio = (cardHeight: number, descriptionLength: number) => {
  let ratio = 0.56;

  if (cardHeight >= 900) {
    ratio = 0.64;
  } else if (cardHeight >= 780) {
    ratio = 0.6;
  } else if (cardHeight <= 640) {
    ratio = 0.52;
  }

  if (descriptionLength < 120) {
    ratio += 0.1;
  } else if (descriptionLength < 200) {
    ratio += 0.06;
  } else if (descriptionLength < 280) {
    ratio += 0.03;
  }

  return Math.min(0.74, ratio);
};

const getDescriptionLines = (cardHeight: number) => {
  if (cardHeight < 640) return 4;
  if (cardHeight < 760) return 5;
  return 6;
};

export function NewsArticleCard({
  article,
  isForYou = false,
  cardHeight,
}: NewsArticleCardProps) {
  const { isDark, theme } = useTheme();
  const router = useRouter();
  const { bookmarked, toggleBookmark } = useArticleInteractions(article.id);

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

  const handleBookmark = async () => {
    triggerHaptic();
    bookmarkScale.value = withSequence(withSpring(1.4), withSpring(1));
    await toggleBookmark();
  };

  const handleShare = async () => {
    triggerHaptic();
    shareScale.value = withSequence(
      withSpring(1.3, { damping: 8 }),
      withSpring(1, { damping: 8 })
    );
    try {
      await shareArticle({
        id: article.id,
        title: article.Title,
        imageUrl: article["Image URL"],
        articleLink: article["Article Link"],
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const bookmarkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));
  const shareAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));

  const imageUrl = article["Image URL"];
  const titleText = cleanText(article.Title);
  const descriptionText = cleanText(article.Content || article.Summary);
  const imageHeight = Math.round(
    cardHeight * getImageRatio(cardHeight, descriptionText.length),
  );
  const descriptionLines = getDescriptionLines(cardHeight);
  const contentTopPadding = Math.max(20, Math.round(cardHeight * 0.03));
  const contentBottomPadding = Math.max(10, Math.round(cardHeight * 0.015));
  const metaTopMargin = Math.max(8, Math.round(cardHeight * 0.014));
  const cardBg = isDark ? theme.background : theme.surface;
  const actionPillBg = isDark ? "rgba(24,24,27,0.96)" : "rgba(255,255,255,0.96)";
  const actionPillBorder = isDark
    ? "rgba(255,255,255,0.16)"
    : "rgba(26,26,27,0.12)";
  const actionIconColor = isDark ? "#FFFFFF" : "#2B2B2F";
  const actionShadowColor = isDark ? "#000000" : "#111111";

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handlePress}
      style={[
        styles.card,
        {
          height: cardHeight,
          backgroundColor: cardBg,
        },
      ]}
    >
      {/* Image area adapts to screen height and text length */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : (
          <View
            style={[
              styles.image,
              {
                backgroundColor: isDark ? "#1a1a1a" : "#e5e5e7",
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Ionicons
              name="image-outline"
              size={48}
              color={isDark ? "#333" : "#ccc"}
            />
          </View>
        )}
      </View>

      <View
        style={[
          styles.floatingActions,
          {
            top: imageHeight - 18,
            backgroundColor: actionPillBg,
            borderColor: actionPillBorder,
            shadowColor: actionShadowColor,
            shadowOpacity: isDark ? 0.35 : 0.18,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBookmark}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.actionBtn}
        >
          <Animated.View style={bookmarkAnimStyle}>
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={18}
              color={bookmarked ? theme.brand.primary : actionIconColor}
            />
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.actionBtn}
        >
          <Animated.View style={shareAnimStyle}>
            <Ionicons name="share-outline" size={18} color={actionIconColor} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Content area — compact */}
      <View
        style={[
          styles.contentArea,
          { paddingTop: contentTopPadding, paddingBottom: contentBottomPadding },
        ]}
      >
        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: isDark ? theme.text.primary : "#1A1A1B" },
          ]}
          numberOfLines={2}
        >
          {titleText}
        </Text>

        {/* Description */}
        {descriptionText ? (
          <Text
            style={[
              styles.description,
              { color: isDark ? theme.text.secondary : "#555555" },
            ]}
            numberOfLines={descriptionLines}
          >
            {descriptionText}
          </Text>
        ) : null}

        <Text
          style={[
            styles.meta,
            { marginTop: metaTopMargin },
            { color: isDark ? theme.text.tertiary : theme.text.tertiary },
          ]}
          numberOfLines={1}
        >
          1 week ago
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    overflow: "hidden",
  },

  /* Image fixed to 50% */
  imageContainer: {
    width: "100%",
    marginTop: 0,
    paddingTop: 0,
  },
  image: {
    width: "100%",
    height: "100%",
  },

  /* Content below image — compact and fixed by text */
  contentArea: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 32,
    paddingBottom: 12,
  },

  /* Floating action pill between image/content */
  floatingActions: {
    position: "absolute",
    right: 12,
    zIndex: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  actionBtn: {
    paddingHorizontal: 2,
    paddingVertical: 1,
  },

  /* Title */
  title: {
    fontSize: 21,
    fontFamily: "Inter_700Bold",
    lineHeight: 29,
    letterSpacing: -0.2,
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  meta: {
    marginTop: 10,
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
});
