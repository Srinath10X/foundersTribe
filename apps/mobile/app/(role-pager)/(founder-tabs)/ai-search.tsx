import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FlowScreen,
  SurfaceCard,
  T,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { BAR_HEIGHT, BAR_BOTTOM } from "@/components/LiquidTabBar";
import { useTheme } from "@/context/ThemeContext";
import {
  chatWithAI,
  clearFreelancerCache,
  type ChatMessage,
  type FreelancerResult,
} from "@/lib/groqAI";

// ── Suggestion chips ─────────────────────────────────────────

const SUGGESTIONS = [
  "I need a video editor for Instagram reels",
  "Find me a React Native developer",
  "Looking for a logo designer under $500",
  "I need someone to build a landing page fast",
  "Who can help with pitch deck design?",
];

// ── Freelancer Card ──────────────────────────────────────────

function FreelancerCard({
  item,
  palette,
  onPress,
}: {
  item: FreelancerResult;
  palette: ReturnType<typeof useFlowPalette>["palette"];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <SurfaceCard style={styles.freelancerCard}>
        <View style={styles.freelancerTop}>
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: palette.accentSoft },
            ]}
          >
            {item.avatar_url ? (
              <Image
                source={{ uri: item.avatar_url }}
                style={styles.avatarImg}
                contentFit="cover"
              />
            ) : (
              <T
                weight="medium"
                color={palette.accent}
                style={styles.avatarLetter}
              >
                {(item.name || "?").charAt(0).toUpperCase()}
              </T>
            )}
          </View>
          <View style={styles.freelancerInfo}>
            <T
              weight="medium"
              color={palette.text}
              style={styles.freelancerName}
              numberOfLines={1}
            >
              {item.name}
            </T>
            <View style={styles.metaRow}>
              {item.experience_level ? (
                <View
                  style={[
                    styles.metaPill,
                    { backgroundColor: palette.accentSoft },
                  ]}
                >
                  <T
                    weight="regular"
                    color={palette.accent}
                    style={styles.metaPillText}
                  >
                    {item.experience_level}
                  </T>
                </View>
              ) : null}
              {item.hourly_rate ? (
                <T
                  weight="regular"
                  color={palette.subText}
                  style={styles.metaText}
                >
                  ${item.hourly_rate}/hr
                </T>
              ) : null}
              {item.availability === "open" ? (
                <View style={styles.availDot} />
              ) : null}
            </View>
          </View>
        </View>

        <T
          weight="regular"
          color={palette.accent}
          style={styles.matchReason}
          numberOfLines={2}
        >
          {item.matchReason}
        </T>

        {item.services.length > 0 ? (
          <View style={styles.servicesList}>
            {item.services.slice(0, 3).map((svc, i) => (
              <View
                key={`${svc.name}-${i}`}
                style={[
                  styles.serviceChip,
                  { backgroundColor: palette.surface, borderColor: palette.borderLight },
                ]}
              >
                <T
                  weight="regular"
                  color={palette.subText}
                  style={styles.serviceChipText}
                  numberOfLines={1}
                >
                  {svc.name} - {svc.cost}
                </T>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.cardAction}>
          <T weight="medium" color={palette.accent} style={styles.viewProfileText}>
            View Profile
          </T>
          <Ionicons name="chevron-forward" size={14} color={palette.accent} />
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );
}

// ── Message Bubble ───────────────────────────────────────────

function MessageBubble({
  message,
  palette,
  isDark,
  onFreelancerPress,
}: {
  message: ChatMessage;
  palette: ReturnType<typeof useFlowPalette>["palette"];
  isDark: boolean;
  onFreelancerPress: (f: FreelancerResult) => void;
}) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.bubbleWrap,
        isUser ? styles.bubbleRight : styles.bubbleLeft,
      ]}
    >
      {!isUser ? (
        <View
          style={[styles.aiBadge, { backgroundColor: palette.accentSoft }]}
        >
          <Ionicons name="sparkles" size={12} color={palette.accent} />
        </View>
      ) : null}

      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: palette.accent }
            : {
                backgroundColor: palette.surface,
                borderColor: palette.borderLight,
                borderWidth: 1,
              },
        ]}
      >
        <T
          weight="regular"
          color={isUser ? "#fff" : palette.text}
          style={styles.bubbleText}
        >
          {message.content}
        </T>
      </View>

      {message.freelancers && message.freelancers.length > 0 ? (
        <View style={styles.resultsContainer}>
          {message.freelancers.map((f) => (
            <FreelancerCard
              key={f.id}
              item={f}
              palette={palette}
              onPress={() => onFreelancerPress(f)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────

export default function AISearchScreen() {
  const { palette, isDark } = useFlowPalette();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarTotal = BAR_HEIGHT + BAR_BOTTOM;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: msg,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      try {
        const aiResponse = await chatWithAI(msg, messages);
        setMessages((prev) => [...prev, aiResponse]);
      } catch (error: any) {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            error?.message?.includes("GROQ API key")
              ? "AI search is not configured yet. Please add your GROQ API key to the .env file (EXPO_PUBLIC_GROQ_API_KEY)."
              : `Something went wrong: ${error?.message || "Unknown error"}. Please try again.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
      }
    },
    [input, isLoading, messages],
  );

  const handleFreelancerPress = useCallback(
    (f: FreelancerResult) => {
      router.push(
        `/freelancer-stack/freelancer-profile?id=${f.id}` as any,
      );
    },
    [router],
  );

  const showEmptyState = messages.length === 0;

  return (
    <FlowScreen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        {/* ── Header ────────────────────────────────── */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: palette.borderLight,
              backgroundColor: palette.bg,
            },
          ]}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerTitleRow}>
              <LinearGradient
                colors={[palette.accentSoft, palette.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiIconWrap}
              >
                <Ionicons name="sparkles" size={16} color={palette.accent} />
              </LinearGradient>
              <View>
                <T
                  weight="medium"
                  color={palette.text}
                  style={styles.pageTitle}
                >
                  AI Search
                </T>
                <T
                  weight="regular"
                  color={palette.subText}
                  style={styles.pageSubtitle}
                >
                  Find the perfect freelancer
                </T>
              </View>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  {
                    borderColor: palette.borderLight,
                    backgroundColor: palette.surface,
                  },
                ]}
                onPress={() =>
                  router.push(
                    "/(role-pager)/(founder-tabs)/connections" as any,
                  )
                }
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={palette.subText}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  {
                    borderColor: palette.borderLight,
                    backgroundColor: palette.surface,
                  },
                ]}
                onPress={() =>
                  router.push("/(role-pager)/(founder-tabs)/profile" as any)
                }
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={palette.subText}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Chat Messages ─────────────────────────── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.chatContent,
            { paddingBottom: tabBarTotal + 80 },
            showEmptyState && styles.chatContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[palette.accentSoft, "transparent"]}
                style={styles.emptyGlow}
              />
              <View
                style={[
                  styles.emptyIconWrap,
                  { backgroundColor: palette.accentSoft },
                ]}
              >
                <Ionicons name="sparkles" size={32} color={palette.accent} />
              </View>
              <T
                weight="medium"
                color={palette.text}
                style={styles.emptyTitle}
              >
                AI-Powered Freelancer Search
              </T>
              <T
                weight="regular"
                color={palette.subText}
                style={styles.emptySubtitle}
              >
                Describe what you need in plain language and I'll find the best
                freelancers for you.
              </T>

              <View style={styles.suggestionsWrap}>
                <T
                  weight="medium"
                  color={palette.subText}
                  style={styles.suggestionsLabel}
                >
                  Try asking:
                </T>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    activeOpacity={0.8}
                    onPress={() => handleSend(s)}
                    style={[
                      styles.suggestionChip,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.borderLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={12}
                      color={palette.subText}
                    />
                    <T
                      weight="regular"
                      color={palette.text}
                      style={styles.suggestionText}
                    >
                      {s}
                    </T>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              palette={palette}
              isDark={isDark}
              onFreelancerPress={handleFreelancerPress}
            />
          )}
          ListFooterComponent={
            isLoading ? (
              <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
                <View
                  style={[
                    styles.aiBadge,
                    { backgroundColor: palette.accentSoft },
                  ]}
                >
                  <Ionicons name="sparkles" size={12} color={palette.accent} />
                </View>
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.borderLight,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.typingRow}>
                    <ActivityIndicator size="small" color={palette.accent} />
                    <T
                      weight="regular"
                      color={palette.subText}
                      style={styles.typingText}
                    >
                      Searching freelancers...
                    </T>
                  </View>
                </View>
              </View>
            ) : null
          }
        />

        {/* ── Input Bar ─────────────────────────────── */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: palette.bg,
              borderTopColor: palette.borderLight,
              paddingBottom: keyboardVisible ? 8 : tabBarTotal,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: palette.surface,
                borderColor: palette.borderLight,
              },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Describe the freelancer you need..."
              placeholderTextColor={palette.subText}
              style={[styles.input, { color: palette.text }]}
              multiline
              maxLength={500}
              editable={!isLoading}
              onSubmitEditing={() => handleSend()}
              blurOnSubmit
            />
            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={!input.trim() || isLoading}
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    input.trim() && !isLoading
                      ? palette.accent
                      : palette.borderLight,
                },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={input.trim() && !isLoading ? "#fff" : palette.subText}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Chat
  chatContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 16,
  },
  chatContentEmpty: {
    flex: 1,
    justifyContent: "center",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyGlow: {
    position: "absolute",
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.5,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 280,
  },
  suggestionsWrap: {
    marginTop: 22,
    gap: 8,
    width: "100%",
  },
  suggestionsLabel: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 2,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },

  // Bubbles
  bubbleWrap: {
    gap: 6,
  },
  bubbleLeft: {
    alignItems: "flex-start",
    paddingRight: 40,
  },
  bubbleRight: {
    alignItems: "flex-end",
    paddingLeft: 40,
  },
  aiBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 19,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Freelancer results
  resultsContainer: {
    gap: 8,
    width: "100%",
    marginTop: 4,
  },
  freelancerCard: {
    padding: 12,
    gap: 8,
  },
  freelancerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarLetter: {
    fontSize: 16,
    lineHeight: 20,
  },
  freelancerInfo: {
    flex: 1,
    minWidth: 0,
  },
  freelancerName: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  metaPillText: {
    fontSize: 10,
    lineHeight: 13,
    textTransform: "capitalize",
  },
  metaText: {
    fontSize: 10,
    lineHeight: 13,
  },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  matchReason: {
    fontSize: 11,
    lineHeight: 15,
    fontStyle: "italic",
  },
  servicesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  serviceChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  serviceChipText: {
    fontSize: 10,
    lineHeight: 13,
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
  },
  viewProfileText: {
    fontSize: 11,
    lineHeight: 14,
  },

  // Input bar
  inputBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingHorizontal: 18,
    borderTopWidth: 1,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 20,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 18,
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
