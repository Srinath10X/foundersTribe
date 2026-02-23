import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Spacing } from "../constants/DesignSystem";

interface MessageBubbleProps {
  message: {
    id: string;
    content?: string;
    type?: string;
    media_url?: string;
    sender_id: string;
    profiles?: {
      username?: string;
      display_name?: string;
      avatar_url?: string;
      photo_url?: string;
    };
    created_at: string;
    edited_at?: string;
    is_deleted?: boolean;
    reply_to?: { id: string; content?: string; sender_id: string };
    reactions?: { emoji: string; count: number; user_reacted?: boolean }[];
  };
  isOwn: boolean;
  isAdmin: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  showActions: boolean;
  onToggleActions: () => void;
  canEdit?: boolean;
  onOpenImage?: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  isJumpHighlighted?: boolean;
  fallbackProfile?: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
  };
  currentUserName?: string;
  currentUserAvatarUrl?: string | null;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "👀"];

export default function MessageBubble({
  message,
  isOwn,
  isAdmin,
  onReply,
  onEdit,
  onDelete,
  onReact,
  showActions,
  onToggleActions,
  canEdit = true,
  onOpenImage,
  onJumpToMessage,
  isJumpHighlighted = false,
  fallbackProfile,
  currentUserName,
  currentUserAvatarUrl,
}: MessageBubbleProps) {
  const { theme } = useTheme();
  const toHttpUrl = (value?: string | null) => {
    const v = (value || "").trim();
    return /^https?:\/\//i.test(v) ? v : "";
  };

  const senderName = isOwn
    ? message.profiles?.display_name ||
      message.profiles?.username ||
      currentUserName ||
      "You"
    : message.profiles?.display_name ||
      message.profiles?.username ||
      fallbackProfile?.display_name ||
      fallbackProfile?.username ||
      "Unknown";
  const senderAvatar = isOwn
    ? toHttpUrl(message.profiles?.avatar_url) ||
      toHttpUrl(message.profiles?.photo_url) ||
      toHttpUrl(currentUserAvatarUrl || "") ||
      ""
    : toHttpUrl(message.profiles?.avatar_url) ||
      toHttpUrl(message.profiles?.photo_url) ||
      toHttpUrl(fallbackProfile?.avatar_url) ||
      "";
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.rowWrap}>
      <View style={styles.avatarWrap}>
        {senderAvatar ? (
          <Image source={{ uri: senderAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { borderColor: theme.border }]}>
            <Text style={[styles.avatarInitial, { color: theme.brand.primary }]}>
              {senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.contentWrap,
          isJumpHighlighted && {
            backgroundColor: `${theme.brand.primary}12`,
            borderColor: `${theme.brand.primary}55`,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 4,
          },
        ]}
        activeOpacity={0.9}
        onLongPress={onToggleActions}
      >
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: theme.brand.primary }]}>
            {senderName}
          </Text>
          <Text style={[styles.time, { color: theme.text.tertiary }]}>
            {time}
          </Text>
          {message.edited_at ? (
            <Text style={[styles.edited, { color: theme.brand.primary }]}>
              (edited)
            </Text>
          ) : null}
        </View>

        {message.reply_to ? (
          <TouchableOpacity
            onPress={() =>
              message.reply_to?.id && onJumpToMessage
                ? onJumpToMessage(message.reply_to.id)
                : undefined
            }
            activeOpacity={0.75}
          >
            <View style={[styles.replyBlock, { borderLeftColor: theme.brand.primary }]}>
            <Text style={[styles.replyText, { color: theme.text.secondary }]} numberOfLines={1}>
              Replying to: {message.reply_to.content || "Media"}
            </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {message.is_deleted ? (
          <Text style={[styles.messageText, styles.deleted, { color: theme.text.tertiary }]}>
            This message was deleted
          </Text>
        ) : null}

        {message.type === "image" && message.media_url ? (
          <TouchableOpacity
            style={[styles.imageWrap, { borderColor: theme.border }]}
            onPress={() =>
              onOpenImage ? onOpenImage(message.id) : Linking.openURL(message.media_url!)
            }
            activeOpacity={0.9}
          >
            <Image source={{ uri: message.media_url }} style={styles.image} resizeMode="cover" />
          </TouchableOpacity>
        ) : null}

        {message.type === "file" && message.media_url ? (
          <TouchableOpacity
            style={[styles.fileCard, { borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
            onPress={() => Linking.openURL(message.media_url!)}
            activeOpacity={0.9}
          >
            <Ionicons name="document-outline" size={18} color={theme.brand.primary} />
            <Text style={[styles.fileName, { color: theme.text.primary }]} numberOfLines={1}>
              {message.content || "Attachment"}
            </Text>
            <Ionicons name="download-outline" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        ) : null}

        {message.type !== "file" && !message.is_deleted && message.content ? (
          <Text style={[styles.messageText, { color: theme.text.primary }]}>
            {message.content}
          </Text>
        ) : null}
      </TouchableOpacity>

      {message.reactions?.length ? (
        <View style={styles.reactionsRow}>
          {message.reactions.map((r) => (
            <TouchableOpacity
              key={r.emoji}
              style={[
                styles.reaction,
                {
                  backgroundColor: r.user_reacted ? `${theme.brand.primary}1f` : theme.surfaceElevated,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => onReact(r.emoji)}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              <Text style={[styles.reactionCount, { color: theme.text.secondary }]}>{r.count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {showActions ? (
        <View style={[styles.actions, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.quickRow}>
            {QUICK_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => {
                  onReact(e);
                  onToggleActions();
                }}
                style={styles.quickBtn}
              >
                <Text style={styles.quickEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={styles.actionRow} onPress={() => { onReply(); onToggleActions(); }}>
            <Ionicons name="arrow-undo-outline" size={16} color={theme.text.primary} />
            <Text style={[styles.actionText, { color: theme.text.primary }]}>Reply</Text>
          </TouchableOpacity>
          {isOwn && canEdit ? (
            <TouchableOpacity style={styles.actionRow} onPress={() => { onEdit(); onToggleActions(); }}>
              <Ionicons name="pencil-outline" size={16} color={theme.text.primary} />
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Edit</Text>
            </TouchableOpacity>
          ) : null}
          {isOwn && !canEdit ? (
            <View style={styles.actionRow}>
              <Ionicons name="time-outline" size={16} color={theme.text.tertiary} />
              <Text style={[styles.actionText, { color: theme.text.tertiary }]}>Edit window expired</Text>
            </View>
          ) : null}
          {isOwn || isAdmin ? (
            <TouchableOpacity style={styles.actionRow} onPress={() => { onDelete(); onToggleActions(); }}>
              <Ionicons name="trash-outline" size={16} color={theme.error} />
              <Text style={[styles.actionText, { color: theme.error }]}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  avatarWrap: {
    position: "absolute",
    left: Spacing.sm,
    top: 8,
    width: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  contentWrap: {
    marginLeft: 52,
    marginRight: Spacing.xs,
    alignSelf: "flex-start",
    maxWidth: "84%",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 2,
  },
  name: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
  },
  time: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "Poppins_500Medium",
  },
  edited: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "Poppins_400Regular",
    fontStyle: "italic",
  },
  replyBlock: {
    borderLeftWidth: 2,
    paddingLeft: 8,
    marginBottom: 4,
  },
  replyText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_400Regular",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_400Regular",
  },
  deleted: {
    fontStyle: "italic",
  },
  imageWrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 2,
  },
  image: {
    width: 184,
    height: 204,
  },
  fileCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium",
  },
  reactionsRow: {
    marginLeft: 52,
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  reaction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "Poppins_500Medium",
  },
  actions: {
    position: "absolute",
    left: 52,
    top: -2,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    minWidth: 176,
    zIndex: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  quickBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickEmoji: {
    fontSize: 18,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginVertical: 3,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  actionText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
});
