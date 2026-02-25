import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import {
  useAcceptProposal,
  useContracts,
  useGigProposals,
  useRejectProposal,
} from "@/hooks/useGig";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import type { Proposal, ProposalStatus } from "@/types/gig";

type StatusFilter = "all" | ProposalStatus;
type SortKey = "recent" | "amount_low" | "amount_high" | "timeline";

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
];

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "amount_low", label: "Amount: Low-High" },
  { key: "amount_high", label: "Amount: High-Low" },
  { key: "timeline", label: "Fastest timeline" },
];
const STORAGE_BUCKET = "tribe-media";

function formatAmount(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return "INR 0";
  return `INR ${num.toLocaleString()}`;
}

function formatProposalDate(input: string) {
  const ts = new Date(input).getTime();
  if (Number.isNaN(ts)) return "Recently";

  const diff = Date.now() - ts;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / dayMs);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}

function parseCoverLetter(coverLetter: string) {
  const screeningMarker = "\n\nScreening Answers:";
  const milestonesMarker = "\n\nMilestones:";
  const portfolioMarker = "\n\nPortfolio:";
  const availabilityMarker = "\n\nAvailability:";

  const baseEndCandidates = [
    coverLetter.indexOf(milestonesMarker),
    coverLetter.indexOf(portfolioMarker),
    coverLetter.indexOf(availabilityMarker),
    coverLetter.indexOf(screeningMarker),
  ].filter((idx) => idx >= 0);

  const baseEnd = baseEndCandidates.length > 0 ? Math.min(...baseEndCandidates) : coverLetter.length;
  const summary = coverLetter.slice(0, baseEnd).trim();

  const screeningStart = coverLetter.indexOf(screeningMarker);
  if (screeningStart < 0) {
    return { summary, screeningAnswers: [] as string[] };
  }

  const screeningBlock = coverLetter.slice(screeningStart + screeningMarker.length).trim();
  const answers = screeningBlock
    .split("\n\n")
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3);

  return { summary, screeningAnswers: answers };
}

function statusColors(status: ProposalStatus, palette: ReturnType<typeof useFlowPalette>["palette"]) {
  if (status === "pending") {
    return { text: "#F59E0B", bg: "rgba(245,158,11,0.12)" };
  }
  if (status === "accepted") {
    return { text: "#34C759", bg: "rgba(52,199,89,0.12)" };
  }
  if (status === "rejected") {
    return { text: "#FF3B30", bg: "rgba(255,59,48,0.12)" };
  }
  if (status === "shortlisted") {
    return { text: "#2A63F6", bg: "rgba(42,99,246,0.12)" };
  }
  return { text: palette.subText, bg: palette.border };
}

async function resolveAvatar(candidate: unknown, userId: string): Promise<string | null> {
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
  const { data: files } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 20 });
  if (!Array.isArray(files) || files.length === 0) return null;
  const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
  if (!preferred?.name) return null;

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
  return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
}

export default function GigProposalsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { gigId } = useLocalSearchParams<{ gigId?: string }>();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [publicProfiles, setPublicProfiles] = useState<Record<string, any>>({});

  const { data, isLoading, error, refetch } = useGigProposals(gigId);
  const { data: contractsData, refetch: refetchContracts } = useContracts({ limit: 200 });
  const acceptMutation = useAcceptProposal();
  const rejectMutation = useRejectProposal();

  const contracts = useMemo(() => contractsData?.items ?? [], [contractsData?.items]);
  const contractByProposalId = useMemo(() => {
    const map: Record<string, (typeof contracts)[number]> = {};
    contracts.forEach((contract) => {
      if (!contract?.proposal_id) return;
      const existing = map[contract.proposal_id];
      if (!existing) {
        map[contract.proposal_id] = contract;
        return;
      }
      const oldTs = new Date(existing.updated_at || existing.created_at).getTime();
      const currentTs = new Date(contract.updated_at || contract.created_at).getTime();
      if (currentTs > oldTs) {
        map[contract.proposal_id] = contract;
      }
    });
    return map;
  }, [contracts]);

  const proposalsRaw = useMemo(() => data?.items ?? [], [data?.items]);
  useEffect(() => {
    if (!session?.access_token || proposalsRaw.length === 0) return;

    const missingFreelancerIds = Array.from(
      new Set(
        proposalsRaw
          .map((proposal) => proposal.freelancer_id)
          .filter((id) => Boolean(id) && !publicProfiles[id]),
      ),
    );

    if (missingFreelancerIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(
        missingFreelancerIds.map(async (userId) => {
          try {
            const profile = await tribeApi.getPublicProfile(session.access_token, userId);
            const resolvedAvatar = await resolveAvatar(
              profile?.photo_url || profile?.avatar_url || null,
              userId,
            );
            return [
              userId,
              {
                ...profile,
                avatar_url: resolvedAvatar || profile?.avatar_url || null,
                photo_url: resolvedAvatar || profile?.photo_url || null,
              },
            ] as const;
          } catch {
            return [userId, null] as const;
          }
        }),
      );

      if (cancelled) return;
      setPublicProfiles((prev) => {
        const next = { ...prev };
        pairs.forEach(([userId, profile]) => {
          next[userId] = profile;
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [proposalsRaw, publicProfiles, session?.access_token]);

  const hasAccepted = useMemo(
    () => proposalsRaw.some((proposal) => proposal.status === "accepted"),
    [proposalsRaw],
  );

  const statusCounts = useMemo(() => {
    return {
      all: proposalsRaw.length,
      pending: proposalsRaw.filter((p) => p.status === "pending").length,
      shortlisted: proposalsRaw.filter((p) => p.status === "shortlisted").length,
      accepted: proposalsRaw.filter((p) => p.status === "accepted").length,
      rejected: proposalsRaw.filter((p) => p.status === "rejected").length,
    };
  }, [proposalsRaw]);

  const proposals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = proposalsRaw.filter((proposal) => {
      if (statusFilter !== "all" && proposal.status !== statusFilter) return false;
      if (!query) return true;
      const cover = parseCoverLetter(proposal.cover_letter);
      return (
        (proposal.freelancer?.full_name || "").toLowerCase().includes(query) ||
        (proposal.freelancer?.handle || "").toLowerCase().includes(query) ||
        proposal.cover_letter.toLowerCase().includes(query) ||
        cover.summary.toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered];
    if (sortBy === "amount_low") {
      sorted.sort((a, b) => Number(a.proposed_amount || 0) - Number(b.proposed_amount || 0));
      return sorted;
    }
    if (sortBy === "amount_high") {
      sorted.sort((a, b) => Number(b.proposed_amount || 0) - Number(a.proposed_amount || 0));
      return sorted;
    }
    if (sortBy === "timeline") {
      sorted.sort((a, b) => (a.estimated_days || 9999) - (b.estimated_days || 9999));
      return sorted;
    }
    sorted.sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime(),
    );
    return sorted;
  }, [proposalsRaw, searchQuery, sortBy, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([refetch(), refetchContracts()]);
    setRefreshing(false);
  };

  const handleAccept = async (proposal: Proposal) => {
    if (!gigId) return;

    Alert.alert(
      "Accept proposal",
      "This will create an active contract and lock further gig edits. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              setActingId(proposal.id);
              const result = await acceptMutation.mutateAsync({ proposalId: proposal.id, gigId });
              if (!result?.contract_id) {
                Alert.alert(
                  "Accept failed",
                  "Contract id was not returned. Please refresh and try again.",
                );
                return;
              }
              nav.push(`/freelancer-stack/contract-details?contractId=${result.contract_id}`);
            } catch (err) {
              const message =
                err && typeof err === "object" && "message" in err
                  ? String((err as any).message)
                  : "Unable to accept proposal right now.";
              Alert.alert("Accept failed", message);
            } finally {
              setActingId(null);
            }
          },
        },
      ],
    );
  };

  const handleReject = async (proposal: Proposal) => {
    if (!gigId) return;

    Alert.alert("Reject proposal", "Are you sure you want to reject this proposal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            setActingId(proposal.id);
            await rejectMutation.mutateAsync({ proposalId: proposal.id, gigId });
          } catch (err) {
            const message =
              err && typeof err === "object" && "message" in err
                ? String((err as any).message)
                : "Unable to reject proposal right now.";
            Alert.alert("Reject failed", message);
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <FlowScreen>
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 10, borderBottomColor: palette.borderLight, backgroundColor: palette.bg },
          ]}
        >
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
            onPress={nav.back}
          >
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>
              Proposals
            </T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
              Review, compare, and finalize hiring
            </T>
          </View>
        </View>
        <View style={styles.feedbackWrap}>
          <LoadingState rows={4} />
        </View>
      </FlowScreen>
    );
  }

  if (error) {
    return (
      <FlowScreen>
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 10, borderBottomColor: palette.borderLight, backgroundColor: palette.bg },
          ]}
        >
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
            onPress={nav.back}
          >
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>
              Proposals
            </T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
              Review, compare, and finalize hiring
            </T>
          </View>
        </View>
        <View style={styles.feedbackWrap}>
          <ErrorState title="Failed to load proposals" message={error.message} onRetry={() => refetch()} />
        </View>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen scroll={false}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, borderBottomColor: palette.borderLight, backgroundColor: palette.bg },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
          onPress={nav.back}
        >
          <Ionicons name="arrow-back" size={15} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>
            Proposals
          </T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
            Review, compare, and finalize hiring
          </T>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          <View style={[styles.searchBar, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}> 
            <Ionicons name="search" size={15} color={palette.subText} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Search by name or keywords"
              placeholderTextColor={palette.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={palette.subText} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => setShowFilters((prev) => !prev)}
            style={[styles.filterBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
            activeOpacity={0.84}
          >
            <View style={styles.filterBtnLeft}>
              <Ionicons name="options-outline" size={14} color={palette.subText} />
              <T weight="medium" color={palette.text} style={styles.filterBtnText}>
                Filters
              </T>
            </View>
            <Ionicons name={showFilters ? "chevron-up" : "chevron-down"} size={15} color={palette.subText} />
          </TouchableOpacity>

          {showFilters ? (
            <SurfaceCard style={styles.filtersCard}>
              <T weight="medium" color={palette.subText} style={styles.filterLabel}>
                Status
              </T>
              <View style={styles.filterRow}>
                {statusFilters.map((item) => {
                  const active = statusFilter === item.key;
                  const count = statusCounts[item.key];
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setStatusFilter(item.key)}
                      style={[
                        styles.filterChip,
                        {
                          borderColor: active ? palette.accent : palette.borderLight,
                          backgroundColor: active ? palette.accentSoft : palette.surface,
                        },
                      ]}
                    >
                      <T
                        weight="regular"
                        color={active ? palette.accent : palette.subText}
                        style={styles.filterChipText}
                      >
                        {item.label} ({count})
                      </T>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <T weight="medium" color={palette.subText} style={styles.filterLabel}>
                Sort
              </T>
              <View style={styles.filterRow}>
                {sortOptions.map((item) => {
                  const active = sortBy === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setSortBy(item.key)}
                      style={[
                        styles.filterChip,
                        {
                          borderColor: active ? palette.accent : palette.borderLight,
                          backgroundColor: active ? palette.accentSoft : palette.surface,
                        },
                      ]}
                    >
                      <T
                        weight="regular"
                        color={active ? palette.accent : palette.subText}
                        style={styles.filterChipText}
                      >
                        {item.label}
                      </T>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </SurfaceCard>
          ) : null}

          <View style={styles.kpiRow}>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
                Total
              </T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>
                {statusCounts.all}
              </T>
            </SurfaceCard>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
                Pending
              </T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>
                {statusCounts.pending}
              </T>
            </SurfaceCard>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
                Accepted
              </T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>
                {statusCounts.accepted}
              </T>
            </SurfaceCard>
          </View>

          {hasAccepted ? (
            <SurfaceCard style={styles.noticeCard}>
              <View style={styles.noticeHead}>
                <Ionicons name="lock-closed-outline" size={14} color={palette.accent} />
                <T weight="medium" color={palette.text} style={styles.noticeTitle}>
                  Hiring locked for this gig
                </T>
              </View>
              <T weight="regular" color={palette.subText} style={styles.noticeText}>
                A proposal is accepted. Pending proposals can still be viewed, but only accepted contracts can be managed.
              </T>
            </SurfaceCard>
          ) : null}

          {proposals.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No matching proposals"
              subtitle={searchQuery || statusFilter !== "all" ? "Try a different search or filter." : "No one has submitted a proposal yet."}
            />
          ) : (
            <View style={styles.stack}>
              {proposals.map((proposal) => {
                const colors = statusColors(proposal.status, palette);
                const parsedCover = parseCoverLetter(proposal.cover_letter);
                const linkedContract = contractByProposalId[proposal.id];
                const isActing = actingId === proposal.id;
                const isPending = proposal.status === "pending";
                const canDecision = isPending && !hasAccepted;
                const remoteProfile = publicProfiles[proposal.freelancer_id];
                const displayName =
                  remoteProfile?.display_name ||
                  remoteProfile?.full_name ||
                  proposal.freelancer?.full_name ||
                  proposal.freelancer?.handle ||
                  "Freelancer";
                const profileAvatar =
                  remoteProfile?.photo_url ||
                  remoteProfile?.avatar_url ||
                  proposal.freelancer?.avatar_url;
                const profileRole = remoteProfile?.role || remoteProfile?.user_type || "";
                const profileRating = Number(remoteProfile?.rating);
                const profileRate = Number(remoteProfile?.hourly_rate);

                return (
                  <SurfaceCard key={proposal.id} style={styles.card}>
                    <TouchableOpacity
                      style={styles.personRow}
                      onPress={() => nav.push(`/freelancer-stack/freelancer-profile?id=${proposal.freelancer_id}`)}
                      activeOpacity={0.82}
                    >
                      <Avatar
                        source={profileAvatar ? { uri: profileAvatar } : undefined}
                        size={40}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>
                          {displayName}
                        </T>
                        <T weight="regular" color={palette.subText} style={styles.subline} numberOfLines={1}>
                          {[profileRole, formatProposalDate(proposal.created_at)].filter(Boolean).join(" • ")}
                        </T>
                      </View>
                      <View style={[styles.statusChip, { backgroundColor: colors.bg }]}>
                        <T weight="regular" color={colors.text} style={styles.statusText}>
                          {proposal.status.replace("_", " ").toUpperCase()}
                        </T>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.metaRow}>
                      <View style={[styles.metaPill, { backgroundColor: palette.border }]}> 
                        <Ionicons name="wallet-outline" size={13} color={palette.subText} />
                        <T weight="regular" color={palette.subText} style={styles.metaText}>
                          {formatAmount(proposal.proposed_amount)}
                        </T>
                      </View>
                      <View style={[styles.metaPill, { backgroundColor: palette.border }]}> 
                        <Ionicons name="time-outline" size={13} color={palette.subText} />
                        <T weight="regular" color={palette.subText} style={styles.metaText}>
                          {proposal.estimated_days ? `${proposal.estimated_days} days` : "Flexible"}
                        </T>
                      </View>
                      {Number.isFinite(profileRating) && profileRating > 0 ? (
                        <View style={[styles.metaPill, { backgroundColor: palette.border }]}>
                          <Ionicons name="star" size={13} color={palette.subText} />
                          <T weight="regular" color={palette.subText} style={styles.metaText}>
                            {profileRating.toFixed(1)}
                          </T>
                        </View>
                      ) : null}
                      {Number.isFinite(profileRate) && profileRate > 0 ? (
                        <View style={[styles.metaPill, { backgroundColor: palette.border }]}>
                          <Ionicons name="cash-outline" size={13} color={palette.subText} />
                          <T weight="regular" color={palette.subText} style={styles.metaText}>
                            INR {profileRate}/hr
                          </T>
                        </View>
                      ) : null}
                    </View>

                    <T weight="regular" color={palette.subText} style={styles.coverText} numberOfLines={3}>
                      {parsedCover.summary || proposal.cover_letter}
                    </T>

                    {parsedCover.screeningAnswers.length > 0 ? (
                      <View style={styles.screeningWrap}>
                        <T weight="medium" color={palette.subText} style={styles.screeningTitle}>
                          Screening answers
                        </T>
                        {parsedCover.screeningAnswers.map((answer) => (
                          <T key={`${proposal.id}-${answer}`} weight="regular" color={palette.subText} style={styles.screeningText} numberOfLines={2}>
                            {answer}
                          </T>
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.secondaryBtn, { backgroundColor: palette.border }]}
                        onPress={() => nav.push(`/freelancer-stack/freelancer-profile?id=${proposal.freelancer_id}`)}
                        activeOpacity={0.84}
                      >
                        <T weight="regular" color={palette.text} style={styles.btnText}>
                          View Profile
                        </T>
                      </TouchableOpacity>

                      {canDecision ? (
                        <TouchableOpacity
                          style={[styles.warnBtn, { backgroundColor: "rgba(255,59,48,0.12)" }]}
                          onPress={() => handleReject(proposal)}
                          disabled={isActing || rejectMutation.isPending || acceptMutation.isPending}
                          activeOpacity={0.84}
                        >
                          {isActing && rejectMutation.isPending ? (
                            <ActivityIndicator size="small" color="#FF3B30" />
                          ) : (
                            <T weight="medium" color="#FF3B30" style={styles.btnText}>
                              Reject
                            </T>
                          )}
                        </TouchableOpacity>
                      ) : null}

                      {canDecision ? (
                        <TouchableOpacity
                          style={[styles.primaryBtn, { backgroundColor: palette.accent }]}
                          onPress={() => handleAccept(proposal)}
                          disabled={isActing || acceptMutation.isPending || rejectMutation.isPending}
                          activeOpacity={0.84}
                        >
                          {isActing && acceptMutation.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <T weight="medium" color="#fff" style={styles.btnText}>
                              Accept
                            </T>
                          )}
                        </TouchableOpacity>
                      ) : null}

                      {proposal.status === "accepted" ? (
                        <>
                          <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: palette.accentSoft }]}
                            onPress={() => {
                              if (!linkedContract?.id) return;
                              nav.push(
                                `/freelancer-stack/contract-chat-thread?contractId=${linkedContract.id}&title=${encodeURIComponent(
                                  "Contract Chat",
                                )}`,
                              );
                            }}
                            disabled={!linkedContract?.id}
                            activeOpacity={0.84}
                          >
                            <T weight="medium" color={palette.accent} style={styles.btnText}>
                              Chat
                            </T>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: palette.accentSoft }]}
                            onPress={() => {
                              if (!linkedContract?.id) return;
                              nav.push(`/freelancer-stack/contract-details?contractId=${linkedContract.id}`);
                            }}
                            disabled={!linkedContract?.id}
                            activeOpacity={0.84}
                          >
                            <T weight="medium" color={palette.accent} style={styles.btnText}>
                              Contract
                            </T>
                          </TouchableOpacity>
                        </>
                      ) : null}
                    </View>
                  </SurfaceCard>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  feedbackWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
  },
  searchBar: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  filterBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filterBtnText: {
    fontSize: 12,
    lineHeight: 16,
  },
  filtersCard: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipText: {
    fontSize: 11,
    lineHeight: 14,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  kpiLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  kpiValue: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 20,
  },
  noticeCard: {
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  noticeHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noticeTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  noticeText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
  },
  stack: {
    gap: 8,
  },
  card: {
    padding: 12,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: {
    fontSize: 13,
    lineHeight: 17,
  },
  subline: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  profileMetaLine: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    lineHeight: 13,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 14,
  },
  coverText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 15,
  },
  screeningWrap: {
    marginTop: 8,
    gap: 3,
  },
  screeningTitle: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  screeningText: {
    fontSize: 10,
    lineHeight: 14,
  },
  actions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  secondaryBtn: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  warnBtn: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
