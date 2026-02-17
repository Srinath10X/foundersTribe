import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Typography, Spacing, Layout } from "../constants/DesignSystem";

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
}: MessageBubbleProps) {
  const { theme } = useTheme();

  const senderName =
    message.profiles?.display_name ||
    message.profiles?.username ||
    "Unknown";
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (message.is_deleted) {
    return (
      <View style={[styles.wrapper, isOwn && styles.wrapperOwn]}>
        <View
          style={[
            styles.bubble,
            { backgroundColor: theme.surfaceElevated, opacity: 0.5 },
          ]}
        >
          <Text style={[styles.deletedText, { color: theme.text.tertiary }]}>
            This message was deleted
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, isOwn && styles.wrapperOwn]}>
      {/* Sender avatar (others only) */}
      {!isOwn && (
        <View style={styles.avatarContainer}>
          {message.profiles?.avatar_url ? (
            <Image
              source={{ uri: message.profiles.avatar_url }}
              style={styles.avatarImg}
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.brand.primary + '18' }]}>
              <Text style={[styles.avatarInitial, { color: theme.brand.primary }]}>
                {senderName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={onToggleActions}
        style={[
          styles.bubble,
          isOwn
            ? { backgroundColor: theme.brand.primary }
            : { backgroundColor: theme.surfaceElevated },
        ]}
      >
        {/* Sender name (others only) */}
        {!isOwn && (
          <Text style={[styles.sender, { color: theme.brand.secondary }]}>
            {senderName}
          </Text>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <View
            style={[
              styles.replyPreview,
              {
                backgroundColor: isOwn
                  ? "rgba(255,255,255,0.15)"
                  : theme.background,
                borderLeftColor: theme.brand.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.replyText,
                { color: isOwn ? "rgba(255,255,255,0.8)" : theme.text.tertiary },
              ]}
              numberOfLines={1}
            >
              {message.reply_to.content || "Media"}
            </Text>
          </View>
        )}

        {/* Image */}
        {message.type === "image" && message.media_url && (
          <TouchableOpacity
            onPress={() => Linking.openURL(message.media_url!)}
          >
            <Image
              source={{ uri: message.media_url }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* File */}
        {message.type === "file" && message.media_url && (
          <TouchableOpacity
            style={[
              styles.fileRow,
              {
                backgroundColor: isOwn
                  ? "rgba(255,255,255,0.1)"
                  : theme.background,
              },
            ]}
            onPress={() => Linking.openURL(message.media_url!)}
          >
            <Ionicons
              name="document-outline"
              size={22}
              color={isOwn ? "#fff" : theme.text.primary}
            />
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text
                style={[
                  styles.fileName,
                  { color: isOwn ? "#fff" : theme.text.primary },
                ]}
                numberOfLines={1}
              >
                {message.content || "File"}
              </Text>
            </View>
            <Ionicons
              name="download-outline"
              size={18}
              color={isOwn ? "rgba(255,255,255,0.7)" : theme.text.tertiary}
            />
          </TouchableOpacity>
        )}

        {/* Text */}
        {message.type !== "file" && message.content ? (
          <Text
            style={[
              styles.text,
              { color: isOwn ? "#fff" : theme.text.primary },
            ]}
          >
            {message.content}
          </Text>
        ) : null}

        {/* Timestamp + edited */}
        <View style={styles.metaRow}>
          {message.edited_at && (
            <Text
              style={[
                styles.edited,
                {
                  color: isOwn
                    ? "rgba(255,255,255,0.5)"
                    : theme.text.muted,
                },
              ]}
            >
              edited
            </Text>
          )}
          <Text
            style={[
              styles.time,
              {
                color: isOwn
                  ? "rgba(255,255,255,0.6)"
                  : theme.text.muted,
              },
            ]}
          >
            {time}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <View
          style={[styles.reactionsRow, isOwn && { justifyContent: "flex-end" }]}
        >
          {message.reactions.map((r) => (
            <TouchableOpacity
              key={r.emoji}
              style={[
                styles.reactionChip,
                {
                  backgroundColor: r.user_reacted
                    ? theme.brand.primary + "30"
                    : theme.surfaceElevated,
                  borderColor: r.user_reacted
                    ? theme.brand.primary + "50"
                    : theme.border,
                },
              ]}
              onPress={() => onReact(r.emoji)}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              <Text
                style={[styles.reactionCount, { color: theme.text.secondary }]}
              >
                {r.count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick-actions overlay */}
      {showActions && (
        <View
          style={[
            styles.actions,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            isOwn && styles.actionsOwn,
          ]}
        >
          {/* Quick reactions */}
          <View style={styles.quickReactRow}>
            {QUICK_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => {
                  onReact(e);
                  onToggleActions();
                }}
                style={styles.quickReactBtn}
              >
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View
            style={[styles.divider, { backgroundColor: theme.border }]}
          />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              onReply();
              onToggleActions();
            }}
          >
            <Ionicons
              name="arrow-undo-outline"
              size={18}
              color={theme.text.primary}
            />
            <Text style={[styles.actionLabel, { color: theme.text.primary }]}>
              Reply
            </Text>
          </TouchableOpacity>
          {isOwn && (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                onEdit();
                onToggleActions();
              }}
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color={theme.text.primary}
              />
              <Text
                style={[styles.actionLabel, { color: theme.text.primary }]}
              >
                Edit
              </Text>
            </TouchableOpacity>
          )}
          {(isOwn || isAdmin) && (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                onDelete();
                onToggleActions();
              }}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={theme.error}
              />
              <Text style={[styles.actionLabel, { color: theme.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    alignItems: "flex-start",
    flexDirection: "row",
  },
  wrapperOwn: { alignItems: "flex-end", flexDirection: "row-reverse" },
  bubble: {
    maxWidth: "75%",
    borderRadius: Layout.radius.lg,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  avatarContainer: {
    marginRight: 6,
    marginTop: 2,
  },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: "700",
  },
  sender: {
    ...Typography.presets.caption,
    fontWeight: "700",
    marginBottom: 2,
  },
  text: { ...Typography.presets.body, lineHeight: 20 },
  deletedText: {
    ...Typography.presets.bodySmall,
    fontStyle: "italic",
  },
  replyPreview: {
    borderLeftWidth: 2,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 6,
    borderRadius: 4,
  },
  replyText: { ...Typography.presets.caption },
  mediaImage: {
    width: 220,
    height: 160,
    borderRadius: Layout.radius.md,
    marginBottom: 4,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: Layout.radius.md,
    marginBottom: 4,
  },
  fileName: { ...Typography.presets.bodySmall, fontWeight: "600" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  edited: { ...Typography.presets.caption, fontSize: 10, fontStyle: "italic" },
  time: { ...Typography.presets.caption, fontSize: 10 },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, fontWeight: "600" },
  actions: {
    position: "absolute",
    top: -8,
    left: 8,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    padding: Spacing.xs,
    zIndex: 100,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    minWidth: 170,
  },
  actionsOwn: { left: undefined, right: 8 },
  quickReactRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 4,
  },
  quickReactBtn: { padding: 4 },
  divider: { height: 1, marginVertical: 4 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  actionLabel: { ...Typography.presets.body, fontSize: Typography.sizes.sm },
});
