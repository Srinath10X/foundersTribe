import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
    Avatar,
    FlowScreen,
    FlowTopBar,
    T,
    useFlowNav,
    useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { SectionHeader } from "@/components/freelancer/SectionHeader";
import { SP, RADIUS, SCREEN_PADDING } from "@/components/freelancer/designTokens";
import { useContracts } from "@/hooks/useGig";
import type { Contract } from "@/types/gig";

export default function ContractChatScreen() {
    const { palette } = useFlowPalette();
    const nav = useFlowNav();

    const { data, isLoading, error, refetch } = useContracts();

    const contracts = data?.items ?? [];

    // Derive the other party's info from the contract
    const getOtherParty = (contract: Contract) => {
        // In the founder flow, the "other party" is the freelancer
        const freelancer = contract.freelancer;
        return {
            name: freelancer?.full_name || freelancer?.handle || "Freelancer",
            avatar: freelancer?.avatar_url || undefined,
            role: freelancer?.bio?.substring(0, 30) || "Freelancer",
        };
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        } else if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays < 7) {
            return date.toLocaleDateString("en-IN", { weekday: "short" });
        }
        return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    };

    if (isLoading) {
        return (
            <FlowScreen>
                <FlowTopBar title="Chat" showLeft={false} right="create-outline" onRightPress={() => {}} />
                <View style={styles.content}>
                    <LoadingState rows={4} />
                </View>
            </FlowScreen>
        );
    }

    if (error) {
        return (
            <FlowScreen>
                <FlowTopBar title="Chat" showLeft={false} right="create-outline" onRightPress={() => {}} />
                <View style={styles.content}>
                    <ErrorState
                        title="Failed to load conversations"
                        message={error.message}
                        onRetry={() => refetch()}
                    />
                </View>
            </FlowScreen>
        );
    }

    return (
        <FlowScreen>
            <FlowTopBar title="Chat" showLeft={false} right="create-outline" onRightPress={() => {}} />

            <View style={styles.content}>
                <SectionHeader title="Conversations" />

                {contracts.length === 0 ? (
                    <EmptyState
                        icon="chatbubble-outline"
                        title="No Conversations"
                        subtitle="Start a contract with a freelancer to begin chatting."
                    />
                ) : (
                    contracts.map((contract) => {
                        const other = getOtherParty(contract);
                        const gigTitle = contract.gig?.title || "Contract";
                        const isActive = contract.status === "active";

                        return (
                            <TouchableOpacity
                                key={contract.id}
                                onPress={() =>
                                    nav.push(
                                        `/freelancer-stack/contract-chat-thread?contractId=${contract.id}&title=${encodeURIComponent(other.name)}`
                                    )
                                }
                                activeOpacity={1}
                            >
                                <View
                                    style={[
                                        styles.card,
                                        {
                                            backgroundColor: palette.surface,
                                            borderColor: isActive ? palette.accent + "22" : palette.borderLight,
                                        },
                                    ]}
                                >
                                    <View style={styles.row}>
                                        {/* Avatar + online indicator */}
                                        <View style={styles.avatarWrap}>
                                            <Avatar source={other.avatar ? { uri: other.avatar } : undefined} size={52} />
                                            {isActive && (
                                                <View style={[styles.onlineDot, { borderColor: palette.surface }]} />
                                            )}
                                        </View>

                                        {/* Text content */}
                                        <View style={styles.textWrap}>
                                            <View style={styles.nameRow}>
                                                <T
                                                    weight={isActive ? "bold" : "semiBold"}
                                                    color={palette.text}
                                                    style={styles.name}
                                                    numberOfLines={1}
                                                >
                                                    {other.name}
                                                </T>
                                                <T weight="medium" color={palette.mutedText} style={styles.time}>
                                                    {formatDate(contract.updated_at)}
                                                </T>
                                            </View>

                                            {/* Contract/gig title */}
                                            <T weight="medium" color={palette.accent} style={styles.contractLabel} numberOfLines={1}>
                                                {gigTitle}
                                            </T>

                                            {/* Status row */}
                                            <View style={styles.msgRow}>
                                                <T
                                                    weight="regular"
                                                    color={palette.subText}
                                                    style={styles.msg}
                                                    numberOfLines={1}
                                                >
                                                    {contract.status === "active"
                                                        ? "Contract in progress"
                                                        : contract.status === "completed"
                                                            ? "Contract completed"
                                                            : `Contract ${contract.status}`}
                                                </T>
                                                {isActive && (
                                                    <View style={[styles.badge, { backgroundColor: palette.accent }]}>
                                                        <Ionicons name="chatbubble" size={10} color="#fff" />
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
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
