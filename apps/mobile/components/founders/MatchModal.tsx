/**
 * MatchModal – Draggable bottom-sheet shown on connect.
 * - Functional drag handle: swipe down to dismiss
 * - Uses react-native-reanimated + gesture-handler for smooth physics
 * - All icons use Ionicons for consistency (no emojis, no mixed libs)
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Pressable,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import gigService from "@/lib/gigService";

import { useTheme } from "@/context/ThemeContext";
import type { FounderCandidate } from "@/types/founders";

const { height: SCREEN_H } = Dimensions.get("window");
const DISMISS_THRESHOLD = 120;
const SHEET_MAX_TRANSLATE = SCREEN_H * 0.6;

/** Extract initials from a name (e.g. "Sai Charan L." -> "SC") */
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/** Shorten name for subtitle (e.g. "Sai Charan Lakkimsetti" -> "Sai Charan L.") */
function shortenName(name: string | null | undefined): string {
  if (!name) return "this founder";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return name.trim();
  return parts.slice(0, -1).join(" ") + " " + parts[parts.length - 1].charAt(0) + ".";
}

interface MatchModalProps {
  visible: boolean;
  matchedUser: FounderCandidate | null;
  currentUserAvatar: string | null;
  matchId: string | null;
  onChat: (threadId: string, matchedUser: FounderCandidate | null) => void;
  onKeepSwiping: () => void;
  onUndo?: () => void;
}

function MatchModalInner({
  visible,
  matchedUser,
  currentUserAvatar,
  matchId,
  onChat,
  onKeepSwiping,
  onUndo,
}: MatchModalProps) {
  const { theme, isDark } = useTheme();
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const translateY = useSharedValue(SHEET_MAX_TRANSLATE);

  // Animate in when visible changes
  useEffect(() => {
    if (visible) {
      translateY.value = SHEET_MAX_TRANSLATE;
      translateY.value = withSpring(0, { damping: 22, stiffness: 200, mass: 0.8 });
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    translateY.value = withTiming(
      SHEET_MAX_TRANSLATE,
      { duration: 250, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onKeepSwiping)();
      }
    );
  }, [onKeepSwiping, translateY]);

  const handleUndo = useCallback(() => {
    translateY.value = withTiming(
      SHEET_MAX_TRANSLATE,
      { duration: 250, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          if (onUndo) {
            runOnJS(onUndo)();
          } else {
            runOnJS(onKeepSwiping)();
          }
        }
      }
    );
  }, [onUndo, onKeepSwiping, translateY]);

  // Pan gesture for dragging the sheet down
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Only allow dragging down (positive Y), with slight rubber-band up
      if (e.translationY < 0) {
        translateY.value = e.translationY * 0.15; // rubber-band resistance
      } else {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 500) {
        // Dismiss
        translateY.value = withTiming(
          SHEET_MAX_TRANSLATE,
          { duration: 250, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(onKeepSwiping)();
          }
        );
      } else {
        // Snap back
        translateY.value = withSpring(0, { damping: 22, stiffness: 200, mass: 0.8 });
      }
    });

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, SHEET_MAX_TRANSLATE],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  if (!matchedUser) return null;

  const matchAvatar = matchedUser.photo_url || matchedUser.avatar_url;
  const matchedInitials = getInitials(matchedUser.display_name);
  const matchedShortName = shortenName(matchedUser.display_name);

  const backdropColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(26,26,27,0.32)";
  const sheetBg = isDark ? "#1A1A1C" : theme.surface;
  const handleColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(26,26,27,0.22)";
  const titleColor = theme.text.primary;
  const subtitleColor = theme.text.secondary;
  const subtleTextColor = theme.text.tertiary;
  const avatarFallbackBg = isDark ? "#1A1A1C" : "#F2F3F5";
  const avatarInitialsColor = isDark ? "#FFFFFF" : theme.text.primary;
  const currentAvatarBorder = "#34C759";
  const matchAvatarBorder = isDark ? "#2A6A5A" : "rgba(52,199,89,0.7)";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6";
  const inputBorder = isDark ? "rgba(255,255,255,0.12)" : theme.border;
  const inputPlaceholder = isDark ? "#666" : "#9A9CA4";
  const sendBtnActiveBg = isDark ? "#FFFFFF" : "#1A1A1B";
  const sendBtnInactiveBg = isDark ? "rgba(255,255,255,0.12)" : "#E4E5E8";
  const sendBtnActiveColor = isDark ? "#000000" : "#FFFFFF";
  const sendBtnInactiveColor = isDark ? "#555" : "#9A9CA4";
  const undoBg = isDark ? "rgba(255,255,255,0.08)" : "#F2F3F5";
  const undoBorder = isDark ? "rgba(255,255,255,0.12)" : theme.border;
  const undoFg = isDark ? "#FFFFFF" : theme.text.secondary;
  const keepBtnBg = isDark ? "#FFFFFF" : "#1A1A1B";
  const keepBtnFg = isDark ? "#000000" : "#FFFFFF";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Tappable backdrop to dismiss */}
          <Animated.View style={[styles.backdrop, backdropAnimStyle, { backgroundColor: backdropColor }]}>
            <Pressable style={styles.fill} onPress={dismiss} />
          </Animated.View>

          {/* Draggable sheet */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.sheet,
                sheetAnimStyle,
                {
                  backgroundColor: sheetBg,
                  borderColor: isDark ? "transparent" : theme.border,
                  borderTopWidth: isDark ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              {/* Drag handle */}
              <View style={styles.handleRow}>
                <View style={[styles.handle, { backgroundColor: handleColor }]} />
              </View>

              {/* Header row: green checkmark + title & subtitle */}
              <View style={styles.headerRow}>
                <View style={[styles.checkCircle, { backgroundColor: theme.success }]}>
                  <Ionicons name="checkmark" size={24} color="#FFF" />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: titleColor }]}>Connection Established</Text>
                  <Text style={[styles.subtitle, { color: subtitleColor }]}>
                    You &amp; <Text style={[styles.subtitleBold, { color: titleColor }]}>{matchedShortName}</Text> are now connected
                  </Text>
                </View>
              </View>

              {/* Avatar row */}
              <View style={styles.avatarRow}>
                {currentUserAvatar ? (
                  <Image
                    source={{ uri: currentUserAvatar }}
                    style={[styles.avatar, { borderColor: currentAvatarBorder }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarFallback,
                      {
                        borderColor: currentAvatarBorder,
                        backgroundColor: avatarFallbackBg,
                      },
                    ]}
                  >
                    <Text style={[styles.avatarInitials, { color: avatarInitialsColor }]}>U</Text>
                  </View>
                )}

                <View style={styles.handshakeIcon}>
                  <Ionicons name="swap-horizontal" size={18} color={subtleTextColor} />
                </View>

                {matchAvatar ? (
                  <Image
                    source={{ uri: matchAvatar }}
                    style={[styles.avatar, { borderColor: matchAvatarBorder }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarFallback,
                      {
                        borderColor: matchAvatarBorder,
                        backgroundColor: avatarFallbackBg,
                      },
                    ]}
                  >
                    <Text style={[styles.avatarInitials, { color: avatarInitialsColor }]}>{matchedInitials}</Text>
                  </View>
                )}
              </View>

              {/* SAY HELLO label */}
              <View style={styles.sayHelloRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={subtleTextColor} />
                <Text style={[styles.sayHelloText, { color: subtleTextColor }]}>SAY HELLO</Text>
              </View>

              {/* Message input */}
              <View
                style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}
              >
                <TextInput
                  style={[styles.input, { color: theme.text.primary }]}
                  placeholder="Type your first message..."
                  placeholderTextColor={inputPlaceholder}
                  value={message}
                  onChangeText={setMessage}
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: message.trim() ? sendBtnActiveBg : sendBtnInactiveBg,
                    },
                  ]}
                  disabled={!message.trim() || sending}
                  onPress={async () => {
                    if (!message.trim()) return;
                    setSending(true);
                    try {
                      let threadId = matchId;
                      if (threadId) {
                        await gigService.sendServiceRequestMessage(threadId, {
                          message_type: "text",
                          body: message.trim(),
                        });
                      } else {
                        const req = await gigService.createServiceRequest({
                          freelancer_id: matchedUser.id,
                          message: message.trim(),
                        });
                        threadId = req.id;
                      }
                      setMessage("");
                      if (threadId) {
                        onChat(threadId, matchedUser);
                      } else {
                        onKeepSwiping();
                      }
                    } catch (e) {
                      console.error("Failed to set up chat", e);
                    } finally {
                      setSending(false);
                    }
                  }}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={sendBtnActiveColor} />
                  ) : (
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={message.trim() ? sendBtnActiveColor : sendBtnInactiveColor}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Bottom buttons */}
              <View style={styles.bottomRow}>
                <TouchableOpacity
                  style={[styles.undoBtn, { backgroundColor: undoBg, borderColor: undoBorder }]}
                  activeOpacity={0.7}
                  onPress={handleUndo}
                >
                  <Ionicons name="arrow-undo" size={16} color={undoFg} />
                  <Text style={[styles.undoBtnText, { color: undoFg }]}>Undo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.keepExploringBtn, { backgroundColor: keepBtnBg }]}
                  activeOpacity={0.85}
                  onPress={dismiss}
                >
                  <Text style={[styles.keepExploringText, { color: keepBtnFg }]}>Keep Exploring</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

export const MatchModal = React.memo(MatchModalInner);

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A1A1C",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },

  /* Drag handle */
  handleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 18,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  /* Header */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    marginTop: 2,
  },
  subtitleBold: {
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },

  /* Avatar row */
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1C",
  },
  avatarCurrentBorder: {
    borderColor: "#34C759",
  },
  avatarMatchBorder: {
    borderColor: "#2A6A5A",
  },
  avatarInitials: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
  handshakeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Say Hello */
  sayHelloRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sayHelloText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#999",
    letterSpacing: 1,
  },

  /* Input */
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingLeft: 18,
    paddingRight: 6,
    height: 50,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#FFFFFF",
    paddingVertical: 0,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Bottom buttons */
  bottomRow: {
    flexDirection: "row",
    gap: 10,
  },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  undoBtnText: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: "#FFFFFF",
  },
  keepExploringBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  keepExploringText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#000000",
  },
});
