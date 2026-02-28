/**
 * MatchModal – Shown when two founders match.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";
import type { FounderCandidate } from "@/types/founders";

interface MatchModalProps {
    visible: boolean;
    matchedUser: FounderCandidate | null;
    currentUserAvatar: string | null;
    matchId: string | null;
    onChat: (matchId: string) => void;
    onKeepSwiping: () => void;
}

function MatchModalInner({
    visible,
    matchedUser,
    currentUserAvatar,
    matchId,
    onChat,
    onKeepSwiping,
}: MatchModalProps) {
    const { theme, isDark } = useTheme();

    if (!matchedUser) return null;

    const matchAvatar = matchedUser.photo_url || matchedUser.avatar_url;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.backdrop}>
                <View
                    style={[
                        styles.container,
                        { backgroundColor: theme.surfaceElevated },
                    ]}
                >
                    <Ionicons name="sparkles" size={36} color="#FFD700" />

                    <Text style={[styles.title, { color: theme.text.primary }]}>
                        You matched!
                    </Text>

                    <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                        You and {matchedUser.display_name || "this founder"} are both
                        interested in connecting.
                    </Text>

                    <View style={styles.avatarRow}>
                        {currentUserAvatar ? (
                            <Image
                                source={{ uri: currentUserAvatar }}
                                style={[styles.avatar, { borderColor: "#34C759" }]}
                            />
                        ) : (
                            <View
                                style={[
                                    styles.avatar,
                                    styles.avatarFallback,
                                    {
                                        borderColor: "#34C759",
                                        backgroundColor: isDark ? "#1E1E21" : "#F2F2F7",
                                    },
                                ]}
                            >
                                <Ionicons
                                    name="person"
                                    size={28}
                                    color={theme.text.tertiary}
                                />
                            </View>
                        )}

                        <Ionicons name="heart" size={28} color="#FF3B30" />

                        {matchAvatar ? (
                            <Image
                                source={{ uri: matchAvatar }}
                                style={[styles.avatar, { borderColor: "#34C759" }]}
                            />
                        ) : (
                            <View
                                style={[
                                    styles.avatar,
                                    styles.avatarFallback,
                                    {
                                        borderColor: "#34C759",
                                        backgroundColor: isDark ? "#1E1E21" : "#F2F2F7",
                                    },
                                ]}
                            >
                                <Text style={[styles.initials, { color: theme.text.tertiary }]}>
                                    {(matchedUser.display_name || "?").charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: "#34C759" }]}
                        activeOpacity={0.85}
                        onPress={() => matchId && onChat(matchId)}
                    >
                        <Ionicons name="chatbubble" size={18} color="#fff" />
                        <Text style={styles.primaryBtnText}>Go to Chat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryBtn, { borderColor: theme.border }]}
                        activeOpacity={0.85}
                        onPress={onKeepSwiping}
                    >
                        <Text
                            style={[styles.secondaryBtnText, { color: theme.text.primary }]}
                        >
                            Keep Swiping
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export const MatchModal = React.memo(MatchModalInner);

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    container: {
        width: "100%",
        borderRadius: 24,
        padding: 28,
        alignItems: "center",
        gap: 14,
    },
    title: {
        fontSize: 26,
        fontFamily: "Poppins_700Bold",
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: "Poppins_400Regular",
        textAlign: "center",
        lineHeight: 20,
    },
    avatarRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginVertical: 10,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
    },
    avatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    initials: {
        fontSize: 26,
        fontFamily: "Poppins_700Bold",
    },
    primaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        height: 50,
        borderRadius: 14,
        marginTop: 6,
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 16,
        fontFamily: "Poppins_600SemiBold",
    },
    secondaryBtn: {
        width: "100%",
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    secondaryBtnText: {
        fontSize: 15,
        fontFamily: "Poppins_500Medium",
    },
});
