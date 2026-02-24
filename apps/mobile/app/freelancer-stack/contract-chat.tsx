import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
    Avatar,
    FlowScreen,
    FlowTopBar,
    T,
    people,
    useFlowNav,
    useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { SectionHeader } from "@/components/freelancer/SectionHeader";
import { SP, RADIUS, SHADOWS, SCREEN_PADDING } from "@/components/freelancer/designTokens";

// ─── Dummy Chat Threads ────────────────────────────────────────
const chatThreads = [
    {
        id: "c1",
        name: "Arjun Patel",
        role: "React Native Developer",
        avatar: people.alex,
        lastMessage: "I've pushed the latest build. Please review the dashboard screens.",
        time: "10:42 AM",
        unread: 3,
        online: true,
        contractTitle: "Fintech App Development",
    },
    {
        id: "c2",
        name: "Priya Sharma",
        role: "UI/UX Designer",
        avatar: people.sarah,
        lastMessage: "The updated Figma prototypes are ready for review.",
        time: "Yesterday",
        unread: 0,
        online: true,
        contractTitle: "Dashboard Redesign",
    },
    {
        id: "c3",
        name: "Rahul Kumar",
        role: "Backend Engineer",
        avatar: people.jordan,
        lastMessage: "API endpoints are deployed to staging. Running load tests now.",
        time: "Yesterday",
        unread: 1,
        online: false,
        contractTitle: "API Development",
    },
    {
        id: "c4",
        name: "Sneha Gupta",
        role: "Brand Designer",
        avatar: people.female1,
        lastMessage: "Shared the final brand guidelines document. Let me know your thoughts!",
        time: "Mon",
        unread: 0,
        online: false,
        contractTitle: "Brand Identity Package",
    },
    {
        id: "c5",
        name: "Vikram Singh",
        role: "Content Strategist",
        avatar: people.marcus,
        lastMessage: "Here's the content calendar for March. Happy to hop on a call to discuss.",
        time: "Sun",
        unread: 0,
        online: false,
        contractTitle: "Content Strategy",
    },
];

export default function ContractChatScreen() {
    const { palette } = useFlowPalette();
    const nav = useFlowNav();

    return (
        <FlowScreen>
            <FlowTopBar title="Chat" showLeft={false} right="create-outline" onRightPress={() => { }} />

            <View style={styles.content}>
                {/* Active Contracts Section */}
                <SectionHeader title="Conversations" />

                {chatThreads.length === 0 ? (
                    <EmptyState
                        icon="chatbubble-outline"
                        title="No Conversations"
                        subtitle="Start a contract with a freelancer to begin chatting."
                    />
                ) : (
                    chatThreads.map((thread) => (
                        <TouchableOpacity
                            key={thread.id}
                            onPress={() =>
                                nav.push(
                                    `/freelancer-stack/contract-chat-thread?title=${encodeURIComponent(thread.name)}`
                                )
                            }
                            activeOpacity={1}
                        >
                            <View
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: palette.surface,
                                        borderColor: thread.unread > 0 ? palette.accent + "22" : palette.borderLight,
                                    },
                                ]}
                            >
                                <View style={styles.row}>
                                    {/* Avatar + online indicator */}
                                    <View style={styles.avatarWrap}>
                                        <Avatar source={thread.avatar} size={52} />
                                        {thread.online && (
                                            <View style={[styles.onlineDot, { borderColor: palette.surface }]} />
                                        )}
                                    </View>

                                    {/* Text content */}
                                    <View style={styles.textWrap}>
                                        <View style={styles.nameRow}>
                                            <T
                                                weight={thread.unread > 0 ? "bold" : "semiBold"}
                                                color={palette.text}
                                                style={styles.name}
                                                numberOfLines={1}
                                            >
                                                {thread.name}
                                            </T>
                                            <T weight="medium" color={palette.mutedText} style={styles.time}>
                                                {thread.time}
                                            </T>
                                        </View>

                                        {/* Contract title */}
                                        <T weight="medium" color={palette.accent} style={styles.contractLabel} numberOfLines={1}>
                                            {thread.contractTitle}
                                        </T>

                                        {/* Last message */}
                                        <View style={styles.msgRow}>
                                            <T
                                                weight={thread.unread > 0 ? "medium" : "regular"}
                                                color={thread.unread > 0 ? palette.text : palette.subText}
                                                style={styles.msg}
                                                numberOfLines={1}
                                            >
                                                {thread.lastMessage}
                                            </T>
                                            {thread.unread > 0 && (
                                                <View style={[styles.badge, { backgroundColor: palette.accent }]}>
                                                    <T weight="bold" color="#fff" style={styles.badgeTxt}>
                                                        {thread.unread}
                                                    </T>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </FlowScreen>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: SCREEN_PADDING,
        paddingTop: SP._16,
    },
    card: {
        padding: SP._16,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        marginBottom: SP._8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: SP._12,
    },
    avatarWrap: {
        position: "relative",
    },
    onlineDot: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        backgroundColor: "#34C759",
    },
    textWrap: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    name: {
        fontSize: 16,
        flex: 1,
        marginRight: SP._8,
    },
    time: {
        fontSize: 12,
    },
    contractLabel: {
        fontSize: 12,
        marginTop: SP._2,
    },
    msgRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SP._8,
        marginTop: SP._4,
    },
    msg: {
        fontSize: 14,
        flex: 1,
    },
    badge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: SP._8,
        alignItems: "center",
        justifyContent: "center",
    },
    badgeTxt: {
        fontSize: 11,
    },
});
