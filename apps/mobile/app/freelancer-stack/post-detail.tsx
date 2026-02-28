import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    Avatar,
    FlowScreen,
    FlowTopBar,
    SurfaceCard,
    T,
    useFlowNav,
    useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import {
    useFeedPost,
    useFeedComments,
    useToggleLike,
    useAddComment,
} from "@/hooks/useFeed";
import { supabase } from "@/lib/supabase";
import type { FeedPost, FeedComment, FeedPostType } from "@/types/gig";

const SCREEN_WIDTH = Dimensions.get("window").width;
const STORAGE_BUCKET = "tribe-media";

// ============================================================
// HELPERS
// ============================================================

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    const diffWk = Math.floor(diffDay / 7);
    if (diffWk < 4) return `${diffWk}w ago`;
    return new Date(dateStr).toLocaleDateString();
}

function getTypeLabel(
    type: FeedPostType,
): { label: string; color: string; bg: string } | null {
    switch (type) {
        case "hiring":
            return { label: "Hiring", color: "#34C759", bg: "rgba(52,199,89,0.12)" };
        case "milestone":
            return {
                label: "Milestone",
                color: "#FF9500",
                bg: "rgba(255,149,0,0.12)",
            };
        case "showcase":
            return {
                label: "Showcase",
                color: "#007AFF",
                bg: "rgba(0,122,255,0.12)",
            };
        case "insight":
            return {
                label: "Insight",
                color: "#AF52DE",
                bg: "rgba(175,82,222,0.12)",
            };
        case "work_update":
            return { label: "Update", color: "#5AC8FA", bg: "rgba(90,200,250,0.12)" };
        default:
            return null;
    }
}

function getInitials(name: string | null | undefined): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
}

/** Resolve avatar URL from storage path or direct URL */
async function resolveAvatarUrl(
    candidate: string | null | undefined,
    userId: string,
): Promise<string | null> {
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
        return candidate;
    }
    if (typeof candidate === "string" && candidate.trim()) {
        const { data: signedData, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
        if (!error && signedData?.signedUrl) {
            return `${signedData.signedUrl}&t=${Date.now()}`;
        }
    }
    if (!userId) return null;
    const folder = `profiles/${userId}`;
    const { data: files } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(folder, { limit: 20 });
    if (!files?.length) return null;
    const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
    if (!preferred?.name) return null;
    const fullPath = `${folder}/${preferred.name}`;
    const { data: signedData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(fullPath, 60 * 60 * 24 * 30);
    return signedData?.signedUrl
        ? `${signedData.signedUrl}&t=${Date.now()}`
        : null;
}

const avatarCache = new Map<string, string | null>();

function useResolvedAvatar(
    avatarUrl: string | null | undefined,
    userId: string | undefined,
): string | null {
    const cacheKey = userId || "";
    const [resolved, setResolved] = useState<string | null>(
        avatarCache.get(cacheKey) ?? null,
    );

    useEffect(() => {
        if (!userId) return;
        if (avatarCache.has(cacheKey)) {
            setResolved(avatarCache.get(cacheKey) ?? null);
            return;
        }
        let cancelled = false;
        resolveAvatarUrl(avatarUrl, userId).then((url) => {
            if (cancelled) return;
            avatarCache.set(cacheKey, url);
            setResolved(url);
        });
        return () => {
            cancelled = true;
        };
    }, [avatarUrl, userId, cacheKey]);

    return resolved;
}

// ============================================================
// IMAGE CAROUSEL
// ============================================================

function ImageCarousel({ images }: { images: string[] }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    if (images.length === 0) return null;

    if (images.length === 1) {
        return (
            <Image
                source={{ uri: images[0] }}
                style={styles.singleImage}
                contentFit="cover"
                transition={200}
            />
        );
    }

    return (
        <View>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(
                        e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                    );
                    setActiveIndex(index);
                }}
            >
                {images.map((uri, idx) => (
                    <Image
                        key={idx}
                        source={{ uri }}
                        style={styles.carouselImage}
                        contentFit="cover"
                        transition={200}
                    />
                ))}
            </ScrollView>
            {/* Dots indicator */}
            <View style={styles.dotsContainer}>
                {images.map((_, idx) => (
                    <View
                        key={idx}
                        style={[
                            styles.dot,
                            {
                                backgroundColor:
                                    idx === activeIndex
                                        ? "#007AFF"
                                        : "rgba(255,255,255,0.5)",
                            },
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

// ============================================================
// COMMENT ITEM
// ============================================================

function CommentItem({
    comment,
    palette,
}: {
    comment: FeedComment;
    palette: any;
}) {
    const authorName = comment.user?.full_name || "User";
    const resolvedAvatar = useResolvedAvatar(
        comment.user?.avatar_url,
        comment.user?.id || comment.user_id,
    );
    const initials = getInitials(comment.user?.full_name);

    return (
        <View style={styles.commentItem}>
            {resolvedAvatar ? (
                <Avatar source={{ uri: resolvedAvatar }} size={32} />
            ) : (
                <View
                    style={[
                        styles.commentInitialsCircle,
                        { backgroundColor: palette.accentSoft },
                    ]}
                >
                    <T weight="medium" color={palette.accent} style={styles.commentInitials}>
                        {initials}
                    </T>
                </View>
            )}
            <View style={styles.commentBody}>
                <View style={styles.commentHeader}>
                    <T weight="medium" color={palette.text} style={styles.commentAuthor}>
                        {authorName}
                    </T>
                    <T
                        weight="regular"
                        color={palette.mutedText}
                        style={styles.commentTime}
                    >
                        {timeAgo(comment.created_at)}
                    </T>
                </View>
                <T weight="regular" color={palette.text} style={styles.commentText}>
                    {comment.content}
                </T>
                <View style={styles.commentActions}>
                    <TouchableOpacity activeOpacity={0.7}>
                        <T
                            weight="medium"
                            color={palette.mutedText}
                            style={styles.commentAction}
                        >
                            Like
                        </T>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7}>
                        <T
                            weight="medium"
                            color={palette.mutedText}
                            style={styles.commentAction}
                        >
                            Reply
                        </T>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function PostDetailScreen() {
    const { palette } = useFlowPalette();
    const insets = useSafeAreaInsets();
    const nav = useFlowNav();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { data: post, isLoading: postLoading } = useFeedPost(id);
    const { data: commentsData, isLoading: commentsLoading } = useFeedComments(id);
    const toggleLike = useToggleLike();
    const addComment = useAddComment();

    const [commentText, setCommentText] = useState("");

    const resolvedAvatar = useResolvedAvatar(
        post?.author?.avatar_url,
        post?.author?.id || post?.author_id,
    );

    const handleLike = useCallback(() => {
        if (!post) return;
        if (toggleLike.isPending) return;
        toggleLike.mutate({ postId: post.id, isLiked: post.is_liked });
    }, [post, toggleLike]);

    const handleSubmitComment = useCallback(() => {
        if (!id || !commentText.trim()) return;
        addComment.mutate(
            { postId: id, data: { content: commentText.trim() } },
            {
                onSuccess: () => setCommentText(""),
            },
        );
    }, [id, commentText, addComment]);

    const comments = commentsData?.items || [];

    if (postLoading || !post) {
        return (
            <FlowScreen scroll={false}>
                <FlowTopBar title="Post" onLeftPress={() => nav.back()} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={palette.accent} />
                    <T weight="regular" color={palette.subText} style={styles.loadingText}>
                        Loading post...
                    </T>
                </View>
            </FlowScreen>
        );
    }

    const typeLabel = getTypeLabel(post.post_type);
    const authorName = post.author?.full_name || "Unknown";
    const authorHandle = post.author?.handle ? `@${post.author.handle}` : "";
    const initials = getInitials(post.author?.full_name);

    return (
        <FlowScreen scroll={false}>
            <FlowTopBar title="Post" onLeftPress={() => nav.back()} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + 80 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Author Row */}
                    <View style={styles.authorSection}>
                        <TouchableOpacity
                            style={styles.authorRow}
                            activeOpacity={0.7}
                            onPress={() =>
                                nav.push(
                                    `/freelancer-stack/freelancer-profile?id=${post.author?.id || post.author_id}`,
                                )
                            }
                        >
                            {resolvedAvatar ? (
                                <Avatar source={{ uri: resolvedAvatar }} size={48} />
                            ) : (
                                <View
                                    style={[
                                        styles.initialsCircle,
                                        { backgroundColor: palette.accentSoft },
                                    ]}
                                >
                                    <T
                                        weight="medium"
                                        color={palette.accent}
                                        style={styles.initialsText}
                                    >
                                        {initials}
                                    </T>
                                </View>
                            )}
                            <View style={styles.authorInfo}>
                                <T
                                    weight="medium"
                                    color={palette.text}
                                    style={styles.authorName}
                                    numberOfLines={1}
                                >
                                    {authorName}
                                </T>
                                {authorHandle ? (
                                    <T
                                        weight="regular"
                                        color={palette.subText}
                                        style={styles.authorHandle}
                                        numberOfLines={1}
                                    >
                                        {authorHandle}
                                    </T>
                                ) : null}
                                <View style={styles.metaRow}>
                                    <T
                                        weight="regular"
                                        color={palette.mutedText}
                                        style={styles.timeText}
                                    >
                                        {timeAgo(post.created_at)}
                                    </T>
                                    {typeLabel && (
                                        <View
                                            style={[
                                                styles.typePill,
                                                { backgroundColor: typeLabel.bg },
                                            ]}
                                        >
                                            <T
                                                weight="medium"
                                                color={typeLabel.color}
                                                style={styles.typeText}
                                            >
                                                {typeLabel.label}
                                            </T>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.contentSection}>
                        <T weight="regular" color={palette.text} style={styles.postContent}>
                            {post.content}
                        </T>
                    </View>

                    {/* Images */}
                    {post.images && post.images.length > 0 && (
                        <ImageCarousel images={post.images} />
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <View style={styles.tagsRow}>
                            {post.tags.map((tag) => (
                                <TouchableOpacity key={tag} activeOpacity={0.7}>
                                    <T
                                        weight="regular"
                                        color={palette.accent}
                                        style={styles.tagText}
                                    >
                                        #{tag}
                                    </T>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Engagement stats bar */}
                    <View
                        style={[
                            styles.statsBar,
                            { borderColor: palette.borderLight },
                        ]}
                    >
                        <T weight="regular" color={palette.subText} style={styles.statText}>
                            {formatCount(post.likes_count)} likes
                        </T>
                        <T weight="regular" color={palette.subText} style={styles.statText}>
                            {formatCount(post.comments_count)} comments
                        </T>
                    </View>

                    {/* Action buttons */}
                    <View
                        style={[
                            styles.actionsRow,
                            { borderColor: palette.borderLight },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.actionBtn}
                            activeOpacity={0.7}
                            disabled={toggleLike.isPending}
                            onPress={handleLike}
                        >
                            <Ionicons
                                name={post.is_liked ? "heart" : "heart-outline"}
                                size={20}
                                color={post.is_liked ? "#FF2D55" : palette.subText}
                            />
                            <T
                                weight="medium"
                                color={post.is_liked ? "#FF2D55" : palette.subText}
                                style={styles.actionText}
                            >
                                Like
                            </T>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                            <Ionicons
                                name="chatbubble-outline"
                                size={19}
                                color={palette.subText}
                            />
                            <T
                                weight="medium"
                                color={palette.subText}
                                style={styles.actionText}
                            >
                                Comment
                            </T>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                            <Ionicons
                                name="paper-plane-outline"
                                size={19}
                                color={palette.subText}
                            />
                            <T
                                weight="medium"
                                color={palette.subText}
                                style={styles.actionText}
                            >
                                Share
                            </T>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                            <Ionicons
                                name="bookmark-outline"
                                size={19}
                                color={palette.subText}
                            />
                            <T
                                weight="medium"
                                color={palette.subText}
                                style={styles.actionText}
                            >
                                Save
                            </T>
                        </TouchableOpacity>
                    </View>

                    {/* Comments */}
                    <View style={styles.commentsSection}>
                        <T weight="medium" color={palette.text} style={styles.commentsTitle}>
                            Comments
                        </T>

                        {commentsLoading ? (
                            <View style={styles.commentsLoading}>
                                <ActivityIndicator size="small" color={palette.accent} />
                            </View>
                        ) : comments.length === 0 ? (
                            <View style={styles.noComments}>
                                <Ionicons
                                    name="chatbubbles-outline"
                                    size={32}
                                    color={palette.mutedText}
                                />
                                <T
                                    weight="regular"
                                    color={palette.subText}
                                    style={styles.noCommentsText}
                                >
                                    No comments yet. Be the first!
                                </T>
                            </View>
                        ) : (
                            comments.map((comment) => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    palette={palette}
                                />
                            ))
                        )}
                    </View>
                </ScrollView>

                {/* Comment input bar */}
                <View
                    style={[
                        styles.commentInputBar,
                        {
                            backgroundColor: palette.bg,
                            borderTopColor: palette.borderLight,
                            paddingBottom: Math.max(insets.bottom, 8),
                        },
                    ]}
                >
                    <TextInput
                        style={[
                            styles.commentInput,
                            {
                                color: palette.text,
                                backgroundColor: palette.surface,
                                borderColor: palette.borderLight,
                            },
                        ]}
                        placeholder="Write a comment..."
                        placeholderTextColor={palette.mutedText}
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendBtn,
                            {
                                backgroundColor: commentText.trim()
                                    ? palette.accent
                                    : palette.borderLight,
                            },
                        ]}
                        activeOpacity={0.7}
                        onPress={handleSubmitComment}
                        disabled={!commentText.trim() || addComment.isPending}
                    >
                        {addComment.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={16} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </FlowScreen>
    );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 80,
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        lineHeight: 18,
    },

    // Author
    authorSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    authorRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    authorInfo: {
        flex: 1,
        minWidth: 0,
    },
    authorName: {
        fontSize: 15,
        lineHeight: 20,
        letterSpacing: -0.2,
    },
    authorHandle: {
        fontSize: 12,
        lineHeight: 16,
        marginTop: 1,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
    },
    timeText: {
        fontSize: 12,
        lineHeight: 15,
    },
    typePill: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    typeText: {
        fontSize: 10,
        lineHeight: 13,
    },
    initialsCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    initialsText: {
        fontSize: 18,
        lineHeight: 22,
    },

    // Content
    contentSection: {
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    postContent: {
        fontSize: 15,
        lineHeight: 22,
        letterSpacing: -0.1,
    },

    // Images
    singleImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 0.75,
        backgroundColor: "rgba(0,0,0,0.05)",
    },
    carouselImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 0.75,
        backgroundColor: "rgba(0,0,0,0.05)",
    },
    dotsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 10,
        gap: 6,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },

    // Tags
    tagsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    tagText: {
        fontSize: 13,
        lineHeight: 17,
    },

    // Stats
    statsBar: {
        flexDirection: "row",
        gap: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginTop: 8,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    statText: {
        fontSize: 12,
        lineHeight: 16,
    },

    // Actions
    actionsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    actionText: {
        fontSize: 12,
        lineHeight: 16,
    },

    // Comments
    commentsSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    commentsTitle: {
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 14,
    },
    commentsLoading: {
        paddingVertical: 20,
        alignItems: "center",
    },
    noComments: {
        alignItems: "center",
        paddingVertical: 30,
        gap: 8,
    },
    noCommentsText: {
        fontSize: 13,
        lineHeight: 18,
    },

    // Comment item
    commentItem: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 16,
    },
    commentInitialsCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    commentInitials: {
        fontSize: 12,
        lineHeight: 15,
    },
    commentBody: {
        flex: 1,
        minWidth: 0,
    },
    commentHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    commentAuthor: {
        fontSize: 13,
        lineHeight: 17,
    },
    commentTime: {
        fontSize: 11,
        lineHeight: 14,
    },
    commentText: {
        fontSize: 13,
        lineHeight: 19,
        marginTop: 3,
    },
    commentActions: {
        flexDirection: "row",
        gap: 16,
        marginTop: 6,
    },
    commentAction: {
        fontSize: 11,
        lineHeight: 14,
    },

    // Comment input bar
    commentInputBar: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        gap: 8,
    },
    commentInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 14,
        lineHeight: 18,
        maxHeight: 100,
        minHeight: 36,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 2,
    },
});
