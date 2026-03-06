import { BAR_BOTTOM, BAR_HEIGHT } from "@/components/CustomTabBar";
import { useTheme } from "@/context/ThemeContext";
import { useArticleInteractions } from "@/hooks/useArticleInteractions";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
    Dimensions,
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

const { width: windowWidth } = Dimensions.get("window");

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
    height: number;
    isForYou?: boolean;
}

export function NewsArticleCard({
    article,
    height,
    isForYou = false,
}: NewsArticleCardProps) {
    const { theme } = useTheme();
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

    const likeAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));
    const bookmarkAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: bookmarkScale.value }],
    }));
    const shareAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: shareScale.value }],
    }));

    const companyName = article["Company Name"] || "News";
    const category = article.Category || "Short News";
    const imageUrl =
        article["Image URL"] ||
        "https://images.unsplash.com/photo-1541560052-5e137f229371";
    const timeAgo = "4d ago";

    const TAB_BAR_TOTAL = BAR_HEIGHT + BAR_BOTTOM;
    const usableHeight = height - TAB_BAR_TOTAL;
    const imageHeight = usableHeight * 0.70;
    const contentHeight = usableHeight * 0.30;

    return (
        <View
            style={[
                styles.container,
                { height, backgroundColor: theme.background },
            ]}
        >
            {/* Hero Image — 75% of usable height */}
            <TouchableOpacity
                activeOpacity={0.97}
                onPress={handlePress}
                style={[styles.imageContainer, { height: imageHeight }]}
            >
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    contentFit="cover"
                    transition={400}
                    cachePolicy="memory-disk"
                />

            </TouchableOpacity>

            {/* Content — 25% of usable height, sits above tab bar */}
            <TouchableOpacity
                activeOpacity={0.97}
                onPress={handlePress}
                style={[
                    styles.content,
                    {
                        height: contentHeight,
                        marginBottom: TAB_BAR_TOTAL + 16,
                        backgroundColor: theme.background,
                    },
                ]}
            >
                {/* Category Label + Actions */}
                <View style={styles.sourceRow}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                            {category}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }} />

                    {/* Horizontal actions in title/content section */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity onPress={handleLike} style={styles.iconBtn}>
                            <Animated.View style={likeAnimatedStyle}>
                                <MaterialIcons
                                    name={liked ? "favorite" : "favorite-outline"}
                                    size={22}
                                    color={liked ? "#FF3B30" : theme.text.secondary}
                                />
                            </Animated.View>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleBookmark} style={styles.iconBtn}>
                            <Animated.View style={bookmarkAnimatedStyle}>
                                <MaterialIcons
                                    name={bookmarked ? "bookmark" : "bookmark-outline"}
                                    size={22}
                                    color={bookmarked ? "#FF3B30" : theme.text.secondary}
                                />
                            </Animated.View>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                            <Animated.View style={shareAnimatedStyle}>
                                <MaterialIcons
                                    name="share"
                                    size={21}
                                    color={theme.text.secondary}
                                />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Headline */}
                <Text
                    style={[styles.headline, { color: theme.text.primary }]}
                    numberOfLines={3}
                >
                    {article.Title}
                </Text>

                {/* Summary */}
                {(article.Summary || article.Content) && (
                    <Text
                        style={[styles.summary, { color: theme.text.secondary }]}
                        numberOfLines={4}
                    >
                        {article.Summary || article.Content}
                    </Text>
                )}

                {/* Footer: Time + Category */}
                <View style={styles.footer}>
                    <Text style={[styles.timeText, { color: theme.text.tertiary }]}>
                        {timeAgo}
                    </Text>
                    <View
                        style={[styles.dot, { backgroundColor: theme.text.tertiary }]}
                    />
                    <Text style={[styles.categoryText, { color: theme.text.tertiary }]}>
                        {category}
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: windowWidth,
        overflow: "hidden",
    },

    // Image — 75% of usable height (explicit height set inline)
    imageContainer: {
        backgroundColor: "#111",
        position: "relative",
    },
    image: {
        width: "100%",
        height: "100%",
    },

    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },

    // Content — 25% of usable height (explicit height set inline)
    content: {
        paddingTop: 14,
        paddingHorizontal: 16,
        gap: 8,
    },

    // Source Row
    sourceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    sourceAvatar: {
        width: 28,
        height: 28,
        borderRadius: 8,
    },
    sourceName: {
        fontSize: 13,
        fontWeight: "600",
        fontFamily: "Poppins_600SemiBold",
        flex: 1,
    },
    categoryBadge: {
        backgroundColor: "rgba(255, 59, 48, 0.15)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryBadgeText: {
        color: "#FF3B30",
        fontSize: 12,
        fontWeight: "700",
        fontFamily: "Poppins_600SemiBold",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    // Headline
    headline: {
        fontSize: 20,
        fontWeight: "700",
        fontFamily: "Poppins_700Bold",
        lineHeight: 27,
        letterSpacing: -0.3,
    },

    // Summary
    summary: {
        fontSize: 14,
        fontWeight: "400",
        fontFamily: "Poppins_400Regular",
        lineHeight: 21,
    },

    // Footer
    footer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    timeText: {
        fontSize: 12,
        fontWeight: "500",
        fontFamily: "Poppins_500Medium",
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: 8,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: "500",
        fontFamily: "Poppins_500Medium",
    },
});
