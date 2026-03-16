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
  T,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { BAR_HEIGHT, BAR_BOTTOM } from "@/components/LiquidTabBar";
import FounderTopHeader from "@/components/navigation/FounderTopHeader";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  chatWithAI,
  type ChatMessage,
  type FreelancerResult,
} from "@/lib/groqAI";

// ── Avatar resolver (same pattern used elsewhere) ────────────

const STORAGE_BUCKET = "tribe-media";

async function resolveAvatar(
  candidate: unknown,
  userId: string
): Promise<string | null> {
  if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
    return candidate;
  }
  if (typeof candidate === "string" && candidate.trim()) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
    if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
  }
  if (!userId) return null;
  const folder = `profiles/${userId}`;
  const { data: files } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folder, { limit: 20 });
  if (!Array.isArray(files) || files.length === 0) return null;
  const preferred =
    files.find((f: any) => /^avatar\./i.test(f.name)) || files[0];
  if (!preferred?.name) return null;
  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
  return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
}

// ── Suggestion chips ─────────────────────────────────────────

const SUGGESTIONS = [
  {
    icon: "briefcase" as const,
    text: "I need a video editor for my reels",
  },
  {
    icon: "logo-react" as const,
    text: "Find me a React Native developer",
  },
  {
    icon: "color-palette" as const,
    text: "Logo designer under ₹5k budget",
  },
  {
    icon: "document-text" as const,
    text: "Who can help with pitch deck design?",
  },
  {
    icon: "people" as const,
    text: "Find founders in Hyderabad building SaaS",
  },
];

const AI_PROMPT_PLACEHOLDER = "Who do you need?";

// ── Freelancer Card ──────────────────────────────────────────

function FreelancerCard({
  item,
  palette,
  isDark,
  onPress,
}: {
  item: FreelancerResult;
  palette: ReturnType<typeof useFlowPalette>["palette"];
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View
        style={[
          styles.freelancerCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.borderLight,
          },
          isDark ? styles.cardShadowDark : styles.cardShadow,
        ]}
      >
        {/* Top Row - Avatar + Info */}
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
                weight="semiBold"
                color={palette.accent}
                style={styles.avatarLetter}
              >
                {(item.name || "?").charAt(0).toUpperCase()}
              </T>
            )}
          </View>
          <View style={styles.freelancerInfo}>
            <View style={styles.nameAndAvailRow}>
              <T
                weight="semiBold"
                color={palette.text}
                style={styles.freelancerName}
                numberOfLines={1}
              >
                {item.name}
              </T>
              {item.availability === "open" ? (
                <View style={styles.availBadge}>
                  <View style={styles.availDot} />
                  <T weight="medium" color="#22C55E" style={styles.availText}>
                    Available
                  </T>
                </View>
              ) : null}
            </View>
            <View style={styles.metaRow}>
              {item.experience_level ? (
                <View
                  style={[
                    styles.metaPill,
                    { backgroundColor: palette.accentSoft },
                  ]}
                >
                  <T
                    weight="medium"
                    color={palette.accent}
                    style={styles.metaPillText}
                  >
                    {item.experience_level}
                  </T>
                </View>
              ) : null}
              {item.hourly_rate ? (
                <View
                  style={[
                    styles.metaPill,
                    {
                      backgroundColor: isDark
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(34,197,94,0.1)",
                    },
                  ]}
                >
                  <T
                    weight="medium"
                    color="#22C55E"
                    style={styles.metaPillText}
                  >
                    ${item.hourly_rate}/hr
                  </T>
                </View>
              ) : null}
              {item.country ? (
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={10}
                    color={palette.mutedText}
                  />
                  <T
                    weight="regular"
                    color={palette.mutedText}
                    style={styles.locationText}
                  >
                    {item.country}
                  </T>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Match Reason */}
        <View
          style={[
            styles.matchReasonWrap,
            {
              backgroundColor: isDark
                ? "rgba(207,32,48,0.08)"
                : "rgba(207,32,48,0.05)",
              borderColor: isDark
                ? "rgba(207,32,48,0.15)"
                : "rgba(207,32,48,0.1)",
            },
          ]}
        >
          <Ionicons name="sparkles" size={11} color={palette.accent} />
          <T
            weight="regular"
            color={palette.accent}
            style={styles.matchReasonText}
            numberOfLines={2}
          >
            {item.matchReason}
          </T>
        </View>

        {/* Services */}
        {item.services.length > 0 ? (
          <View style={styles.servicesList}>
            {item.services.slice(0, 3).map((svc, i) => (
              <View
                key={`${svc.name}-${i}`}
                style={[
                  styles.serviceChip,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                    borderColor: palette.borderLight,
                  },
                ]}
              >
                <T
                  weight="regular"
                  color={palette.subText}
                  style={styles.serviceChipText}
                  numberOfLines={1}
                >
                  {svc.name}
                </T>
                <T
                  weight="semiBold"
                  color={palette.text}
                  style={styles.serviceChipCost}
                >
                  {svc.cost}
                </T>
              </View>
            ))}
          </View>
        ) : null}

        {/* View Profile Action */}
        <TouchableOpacity
          style={[styles.cardAction, { backgroundColor: palette.accent }]}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <T weight="semiBold" color="#fff" style={styles.viewProfileText}>
            View Profile
          </T>
          <Ionicons name="arrow-forward" size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Message Bubble ───────────────────────────────────────────

function MessageBubble({
  message,
  palette,
  isDark,
  onFreelancerPress,
  userAvatar,
}: {
  message: ChatMessage;
  palette: ReturnType<typeof useFlowPalette>["palette"];
  isDark: boolean;
  onFreelancerPress: (f: FreelancerResult) => void;
  userAvatar: string | null;
}) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      style={[
        styles.bubbleWrap,
        isUser ? styles.bubbleRight : styles.bubbleLeft,
      ]}
    >
      {/* Avatar */}
      <View style={styles.msgAvatarCol}>
        {isUser ? (
          userAvatar ? (
            <Image
              source={{ uri: userAvatar }}
              style={styles.msgAvatar}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.msgAvatarFallback,
                { backgroundColor: palette.accent },
              ]}
            >
              <Ionicons name="person" size={13} color="#fff" />
            </View>
          )
        ) : (
          <LinearGradient
            colors={[palette.accentSoft, palette.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.msgAvatarAI}
          >
            <Ionicons name="sparkles" size={13} color={palette.accent} />
          </LinearGradient>
        )}
      </View>

      {/* Content */}
      <View style={styles.msgContent}>
        <View style={styles.msgHeader}>
          <T
            weight="semiBold"
            color={isUser ? palette.text : palette.accent}
            style={styles.msgSender}
          >
            {isUser ? "You" : "AI Assistant"}
          </T>
          <T weight="regular" color={palette.mutedText} style={styles.msgTime}>
            {time}
          </T>
        </View>

        <View
          style={[
            styles.bubble,
            isUser
              ? {
                  backgroundColor: palette.accent,
                  borderBottomRightRadius: 4,
                }
              : {
                  backgroundColor: palette.surface,
                  borderColor: palette.borderLight,
                  borderWidth: 1,
                  borderBottomLeftRadius: 4,
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

        {/* Freelancer Results */}
        {message.freelancers && message.freelancers.length > 0 ? (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Ionicons name="people" size={13} color={palette.accent} />
              <T
                weight="semiBold"
                color={palette.text}
                style={styles.resultsTitle}
              >
                {message.freelancers.length} Match
                {message.freelancers.length > 1 ? "es" : ""} Found
              </T>
            </View>
            {message.freelancers.map((f) => (
              <FreelancerCard
                key={f.id}
                item={f}
                palette={palette}
                isDark={isDark}
                onPress={() => onFreelancerPress(f)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── Typing Indicator ─────────────────────────────────────────

function TypingIndicator({
  palette,
}: {
  palette: ReturnType<typeof useFlowPalette>["palette"];
}) {
  return (
    <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
      <View style={styles.msgAvatarCol}>
        <LinearGradient
          colors={[palette.accentSoft, palette.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.msgAvatarAI}
        >
          <Ionicons name="sparkles" size={13} color={palette.accent} />
        </LinearGradient>
      </View>
      <View style={styles.msgContent}>
        <T weight="semiBold" color={palette.accent} style={styles.msgSender}>
          AI Assistant
        </T>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: palette.surface,
              borderColor: palette.borderLight,
              borderWidth: 1,
              borderBottomLeftRadius: 4,
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
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────

export default function AISearchScreen() {
  const { palette, isDark } = useFlowPalette();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarTotal = BAR_HEIGHT + BAR_BOTTOM;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const shouldAutoScroll = useRef(true);

  // Auto-scroll to bottom whenever content size changes (new messages, freelancer cards rendered, etc.)
  const handleContentSizeChange = useCallback(() => {
    if (shouldAutoScroll.current) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  // Track whether user has manually scrolled up (disable auto-scroll if so)
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    // If user is within 150px of the bottom, re-enable auto-scroll
    shouldAutoScroll.current = distanceFromBottom < 150;
  }, []);

  // Fetch user profile avatar on mount
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, username, photo_url, avatar_url")
          .eq("id", user.id)
          .single();
        if (data) {
          const rawAvatar = data.photo_url || data.avatar_url || null;
          const resolved = await resolveAvatar(rawAvatar, user.id);
          setUserAvatar(resolved);
        }
      } catch {
        // Silently fail
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false)
    );
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
      shouldAutoScroll.current = true;

      try {
        const aiResponse = await chatWithAI(msg, messages);
        setMessages((prev) => [...prev, aiResponse]);
        shouldAutoScroll.current = true;
      } catch (error: any) {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: error?.message?.includes("AI service URL")
            ? "AI search is not configured yet. Please set EXPO_PUBLIC_AI_SERVICE_URL in your .env file."
            : `Something went wrong: ${
                error?.message || "Unknown error"
              }. Please try again.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        shouldAutoScroll.current = true;
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages]
  );

  const handleFreelancerPress = useCallback(
    (f: FreelancerResult) => {
      router.push(`/freelancer-stack/freelancer-profile?id=${f.id}` as any);
    },
    [router]
  );

  // Input bar total height when keyboard is hidden:
  // paddingTop(10) + inputWrap minHeight(46) + paddingBottom(tabBarTotal + 8)
  const inputBarHeight = 10 + 46 + tabBarTotal + 8;

  const showEmptyState = messages.length === 0;
  const landing = {
    bg: palette.bg,
    surface: palette.surface,
    border: palette.borderLight,
    text: palette.text,
    mutedText: palette.subText,
    accent: palette.accent,
    accentSoft: palette.accentSoft,
  };

  return (
    <FlowScreen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <FounderTopHeader withBorder />

        {showEmptyState ? (
          <View
            style={[
              styles.aiLanding,
              {
                paddingTop: 16,
                paddingBottom: tabBarTotal + 14,
              },
            ]}
          >
              <LinearGradient
              colors={[landing.accentSoft, "transparent"]}
              style={styles.aiLandingGlow}
            />
            <View style={styles.aiIconArea}>
              <View style={styles.aiIconShadow} />
              <LinearGradient
                colors={["#FF4F45", "#D21D0F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiLandingIcon}
              >
                <Ionicons name="sparkles" size={36} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <T
              weight="semiBold"
              color={landing.text}
              style={styles.aiLandingTitle}
            >
              AI-Powered Search
            </T>
            <T
              weight="regular"
              color={landing.mutedText}
              style={styles.aiLandingSubtitle}
            >
              Find the perfect match instantly
            </T>

            <View
              style={[
                styles.aiPromptBar,
                {
                  backgroundColor: landing.surface,
                  borderColor: input.trim()
                    ? landing.accent
                    : landing.border,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={landing.mutedText}
              />
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={AI_PROMPT_PLACEHOLDER}
                placeholderTextColor={landing.mutedText}
                style={[styles.aiPromptInput, { color: landing.text }]}
                maxLength={500}
                editable={!isLoading}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={!input.trim() || isLoading}
                style={[
                  styles.aiPromptSend,
                  {
                    opacity: input.trim() && !isLoading ? 1 : 0.45,
                  },
                ]}
              >
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.aiTryAskingWrap}>
              <T
                weight="semiBold"
                color={landing.mutedText}
                style={styles.aiTryAskingLabel}
              >
                TRY ASKING
              </T>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s.text}
                  activeOpacity={0.84}
                  onPress={() => handleSend(s.text)}
                  style={[
                    styles.aiTryCard,
                    {
                      borderColor: landing.border,
                      backgroundColor: landing.surface,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.aiTryCardIcon,
                      { backgroundColor: landing.accentSoft },
                    ]}
                  >
                    <Ionicons
                      name={s.icon}
                      size={15}
                      color={landing.accent}
                    />
                  </View>
                  <T
                    weight="regular"
                    color={landing.text}
                    style={styles.aiTryCardText}
                  >
                    {s.text}
                  </T>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={landing.mutedText}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.chatContent,
                { paddingBottom: inputBarHeight + 16 },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={handleContentSizeChange}
              onScroll={handleScroll}
              scrollEventThrottle={100}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  palette={palette}
                  isDark={isDark}
                  onFreelancerPress={handleFreelancerPress}
                  userAvatar={userAvatar}
                />
              )}
              ListFooterComponent={
                isLoading ? <TypingIndicator palette={palette} /> : null
              }
            />

            <View
              style={[
                styles.inputBar,
                {
                  backgroundColor: palette.bg,
                  borderTopColor: palette.borderLight,
                  paddingBottom: keyboardVisible
                    ? Platform.OS === "ios"
                      ? 4
                      : 8
                    : tabBarTotal + 8,
                },
              ]}
            >
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: palette.surface,
                    borderColor: input.trim()
                      ? palette.accent
                      : palette.borderLight,
                  },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={input.trim() ? palette.accent : palette.mutedText}
                  style={{ alignSelf: "center" }}
                />
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder={AI_PROMPT_PLACEHOLDER}
                  placeholderTextColor={palette.mutedText}
                  style={[styles.input, { color: palette.text }]}
                  maxLength={500}
                  editable={!isLoading}
                  onSubmitEditing={() => handleSend()}
                  returnKeyType="send"
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
                    color={
                      input.trim() && !isLoading ? "#fff" : palette.mutedText
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: 18,
    paddingBottom: 12,
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
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
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
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  profileImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profileFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Chat
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 20,
  },
  chatContentEmpty: {
    flex: 1,
    justifyContent: "center",
  },

  aiLanding: {
    flex: 1,
    paddingHorizontal: 20,
  },
  aiLandingGlow: {
    position: "absolute",
    width: 260,
    height: 220,
    borderRadius: 130,
    top: 8,
    left: "50%",
    marginLeft: -130,
    opacity: 0.52,
  },
  aiIconArea: {
    alignSelf: "center",
    marginTop: 8,
  },
  aiIconShadow: {
    position: "absolute",
    width: 106,
    height: 106,
    borderRadius: 32,
    backgroundColor: "rgba(207,32,48,0.35)",
    top: 8,
    left: 8,
    right: 8,
    bottom: 0,
    zIndex: -1,
    shadowColor: "#CF2030",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 14,
  },
  aiLandingIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  aiLandingTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  aiLandingSubtitle: {
    fontSize: 14,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  aiPromptBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 52,
    gap: 10,
  },
  aiPromptInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 19,
    paddingVertical: 8,
  },
  aiPromptSend: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CF2030",
  },
  aiTryAskingWrap: {
    marginTop: 16,
    gap: 10,
  },
  aiTryAskingLabel: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 2.1,
  },
  aiTryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  aiTryCardIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(207,32,48,0.12)",
  },
  aiTryCardText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  emptyGlow: {
    position: "absolute",
    top: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.4,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 300,
  },
  suggestionsWrap: {
    marginTop: 28,
    gap: 8,
    width: "100%",
  },
  suggestionsLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  suggestionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
  },

  // Message Bubbles
  bubbleWrap: {
    flexDirection: "row",
    gap: 10,
  },
  bubbleLeft: {
    alignItems: "flex-start",
    paddingRight: 24,
  },
  bubbleRight: {
    alignItems: "flex-start",
    paddingLeft: 0,
  },
  msgAvatarCol: {
    width: 30,
    paddingTop: 2,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  msgAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatarAI: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  msgContent: {
    flex: 1,
    gap: 4,
  },
  msgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  msgSender: {
    fontSize: 12,
    lineHeight: 15,
  },
  msgTime: {
    fontSize: 10,
    lineHeight: 12,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typingText: {
    fontSize: 13,
    lineHeight: 17,
  },

  // Freelancer results
  resultsContainer: {
    gap: 10,
    width: "100%",
    marginTop: 8,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  resultsTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  freelancerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardShadow: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardShadowDark: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  freelancerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarLetter: {
    fontSize: 17,
    lineHeight: 21,
  },
  freelancerInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameAndAvailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  freelancerName: {
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  availBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  availText: {
    fontSize: 10,
    lineHeight: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaPillText: {
    fontSize: 10,
    lineHeight: 12,
    textTransform: "capitalize",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  locationText: {
    fontSize: 10,
    lineHeight: 12,
  },
  matchReasonWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  matchReasonText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  servicesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  serviceChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  serviceChipText: {
    fontSize: 11,
    lineHeight: 14,
  },
  serviceChipCost: {
    fontSize: 11,
    lineHeight: 14,
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewProfileText: {
    fontSize: 13,
    lineHeight: 16,
  },

  // Input bar
  inputBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 8,
    minHeight: 52,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 19,
    paddingVertical: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
