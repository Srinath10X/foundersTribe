import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  PrimaryButton,
  SurfaceCard,
  T,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useAuth } from "@/context/AuthContext";
import { useCompleteContract, useContract, useGig } from "@/hooks/useGig";
import { formatTimeline, parseGigDescription } from "@/lib/gigContent";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const STORAGE_BUCKET = "tribe-media";

function formatDateLabel(value?: string | null) {
  if (!value) return "Not set";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "Not set";
  return new Date(ts).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeLabel(value?: string | null) {
  if (!value) return "Not set";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "Not set";
  return new Date(ts).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAmountRange(min?: number | null, max?: number | null) {
  const lo = Number(min || 0);
  const hi = Number(max || 0);
  if (lo <= 0 && hi <= 0) return "Not set";
  if (lo > 0 && hi > 0) return `INR ${lo.toLocaleString()} - INR ${hi.toLocaleString()}`;
  const value = hi > 0 ? hi : lo;
  return `INR ${value.toLocaleString()}`;
}

function formatAmount(value?: number | string | null) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Not set";
  return `INR ${numeric.toLocaleString()}`;
}

function formatFlagLabel(value: boolean, doneLabel = "Done", pendingLabel = "Pending") {
  return value ? doneLabel : pendingLabel;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function formatRole(raw?: string | null, fallback = "Member") {
  if (!raw) return fallback;
  if (/^founder$/i.test(raw)) return "Founder";
  if (/^freelancer$/i.test(raw)) return "Freelancer";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function resolveAvatar(candidate: unknown, userId: string): Promise<string | null> {
  try {
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) return candidate;

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
    const preferred = files.find((file) => /^avatar\./i.test(file.name)) || files[0];
    if (!preferred?.name) return null;

    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
    return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
  } catch {
    return null;
  }
}

function statusMeta(status?: string) {
  switch (status) {
    case "active":
      return { label: "Active", tone: "#34C759", bg: "rgba(52,199,89,0.14)" };
    case "completed":
      return { label: "Completed", tone: "#0A84FF", bg: "rgba(10,132,255,0.14)" };
    case "cancelled":
      return { label: "Cancelled", tone: "#FF3B30", bg: "rgba(255,59,48,0.14)" };
    case "disputed":
      return { label: "Disputed", tone: "#F59E0B", bg: "rgba(245,158,11,0.14)" };
    default:
      return { label: "In Progress", tone: "#8E8E93", bg: "rgba(142,142,147,0.14)" };
  }
}

function progressForContract(contract: {
  status?: string;
  freelancer_marked_complete?: boolean;
  founder_approved?: boolean;
  started_at?: string | null;
  created_at?: string | null;
}) {
  const started = Boolean(contract.started_at || contract.created_at);
  const submitted = Boolean(
    contract.freelancer_marked_complete || contract.founder_approved || contract.status === "completed",
  );
  const approved = Boolean(contract.founder_approved || contract.status === "completed");
  const closedSuccessfully = contract.status === "completed";

  const weighted =
    (started ? 20 : 0) +
    (submitted ? 40 : 0) +
    (approved ? 30 : 0) +
    (closedSuccessfully ? 10 : 0);

  if (contract.status === "cancelled" || contract.status === "disputed") {
    return Math.min(95, weighted);
  }

  return weighted;
}

export default function FreelancerContractDetailsScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[]; contractId?: string | string[] }>();

  const contractId = Array.isArray(params.id)
    ? params.id[0]
    : params.id || (Array.isArray(params.contractId) ? params.contractId[0] : params.contractId) || "";
  const { data: contract, isLoading, error, refetch } = useContract(contractId, !!contractId);
  const { data: fallbackGig } = useGig(contract?.gig_id, Boolean(contract?.gig_id));
  const completeMutation = useCompleteContract();
  const gig = contract?.gig || fallbackGig;

  const status = statusMeta(contract?.status);
  const progress = progressForContract(contract || {});
  const milestones = useMemo(
    () => ({
      started: Boolean(contract?.started_at || contract?.created_at),
      submitted: Boolean(
        contract?.freelancer_marked_complete ||
          contract?.founder_approved ||
          contract?.status === "completed",
      ),
      approved: Boolean(contract?.founder_approved || contract?.status === "completed"),
      closed: contract?.status === "completed",
    }),
    [
      contract?.created_at,
      contract?.founder_approved,
      contract?.freelancer_marked_complete,
      contract?.started_at,
      contract?.status,
    ],
  );
  const parsedContent = useMemo(
    () => parseGigDescription(gig?.description || ""),
    [gig?.description],
  );
  const projectOverviewText = useMemo(() => {
    const parsed = parsedContent.projectOverview?.trim();
    if (parsed) return parsed;
    const rawDescription = String(gig?.description || "").trim();
    if (rawDescription) return rawDescription;
    const proposalSummary = String(contract?.proposal?.cover_letter || "").trim();
    if (proposalSummary) return proposalSummary;
    return "No project overview available.";
  }, [contract?.proposal?.cover_letter, gig?.description, parsedContent.projectOverview]);
  const contractValueText = useMemo(() => {
    const proposalAmount = Number(contract?.proposal?.proposed_amount || 0);
    if (proposalAmount > 0) return formatAmount(proposalAmount);
    const legacyBudget = Number((gig as any)?.budget || 0);
    if (legacyBudget > 0) return formatAmount(legacyBudget);
    return formatAmountRange(gig?.budget_min, gig?.budget_max);
  }, [contract?.proposal?.proposed_amount, gig]);
  const gigSkills = useMemo(
    () =>
      (gig?.gig_tags || [])
        .map((tag) => tag?.tags?.label)
        .filter((item): item is string => Boolean(item)),
    [gig?.gig_tags],
  );

  const isFounderViewer = user?.id ? user.id === contract?.founder_id : false;
  const founderFallback = !isFounderViewer ? gig?.founder : null;
  const counterparty = isFounderViewer ? contract?.freelancer : contract?.founder || founderFallback;
  const counterpartyId = isFounderViewer ? contract?.freelancer_id : contract?.founder_id;
  const [counterpartyProfile, setCounterpartyProfile] = useState<{
    name: string;
    role: string;
    avatar: string | null;
    source: "tribe" | "contract";
  } | null>(null);
  const fallbackName =
    firstString(counterparty?.full_name, counterparty?.handle) || (isFounderViewer ? "Freelancer" : "Founder");
  const fallbackRole = isFounderViewer ? "Freelancer" : "Founder";
  const fallbackAvatar = firstString(counterparty?.avatar_url);
  const counterpartyName = counterpartyProfile?.name || fallbackName;
  const counterpartyRole = counterpartyProfile?.role || fallbackRole;
  const counterpartyAvatar = counterpartyProfile?.avatar || fallbackAvatar || null;

  useEffect(() => {
    if (!counterpartyId) {
      setCounterpartyProfile(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const fallback = {
        name: fallbackName,
        role: fallbackRole,
        avatar: fallbackAvatar || null,
        source: "contract" as const,
      };
      const sessionResult = await supabase.auth.getSession().catch(() => null);
      const accessToken = sessionResult?.data?.session?.access_token || null;
      if (!accessToken) {
        if (!cancelled) setCounterpartyProfile(fallback);
        return;
      }
      try {
        const raw = await tribeApi.getPublicProfile(accessToken, counterpartyId);
        const avatar = await resolveAvatar(raw?.photo_url || raw?.avatar_url || fallback.avatar, counterpartyId);
        if (!cancelled) {
          setCounterpartyProfile({
            name: firstString(raw?.display_name, raw?.full_name, raw?.username, fallback.name) || fallback.name,
            role: formatRole(firstString(raw?.role, raw?.user_type), fallback.role),
            avatar: avatar || fallback.avatar,
            source: "tribe",
          });
        }
      } catch {
        if (!cancelled) setCounterpartyProfile(fallback);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [counterpartyId, fallbackAvatar, fallbackName, fallbackRole]);

  const timelineRows = useMemo(
    () => [
      {
        key: "started",
        label: "Contract started",
        sub: formatDateTimeLabel(contract?.started_at || contract?.created_at),
        done: milestones.started,
      },
      {
        key: "submitted",
        label: "Freelancer submitted work",
        sub:
          contract?.freelancer_marked_complete || contract?.status === "completed"
            ? "Marked complete by freelancer"
            : "Awaiting freelancer submission",
        done: milestones.submitted,
      },
      {
        key: "approved",
        label: "Founder approval",
        sub:
          contract?.founder_approved || contract?.status === "completed"
            ? "Approved by founder"
            : "Pending approval",
        done: milestones.approved,
      },
      {
        key: "closed",
        label: "Contract closed",
        sub:
          contract?.status === "completed"
            ? "Completed successfully"
            : contract?.status === "cancelled"
              ? "Closed as cancelled"
              : contract?.status === "disputed"
                ? "Closed in dispute"
                : "Not completed yet",
        done: milestones.closed,
      },
    ],
    [
      contract?.status,
      contract?.created_at,
      contract?.freelancer_marked_complete,
      contract?.founder_approved,
      contract?.started_at,
      milestones.approved,
      milestones.closed,
      milestones.started,
      milestones.submitted,
    ],
  );

  const handleComplete = async () => {
    if (!contract) return;
    try {
      await completeMutation.mutateAsync(contract.id);
    } catch (err) {
      console.error("Failed to mark contract complete:", err);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}>
      <TouchableOpacity
        style={[styles.iconBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={17} color={palette.text} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <T weight="medium" color={palette.text} style={styles.headerTitle} numberOfLines={1}>
          Contract Details
        </T>
        <T weight="regular" color={palette.subText} style={styles.headerSubtitle} numberOfLines={1}>
          Scope, progress, and collaboration
        </T>
      </View>
    </View>
  );

  if (!contractId) {
    return (
      <FlowScreen>
        {renderHeader()}
        <View style={styles.feedbackWrap}>
          <ErrorState title="No contract selected" message="Contract ID is missing." onRetry={() => router.back()} />
        </View>
      </FlowScreen>
    );
  }

  if (isLoading) {
    return (
      <FlowScreen>
        {renderHeader()}
        <View style={styles.feedbackWrap}>
          <LoadingState rows={4} />
        </View>
      </FlowScreen>
    );
  }

  if (error || !contract) {
    return (
      <FlowScreen>
        {renderHeader()}
        <View style={styles.feedbackWrap}>
          <ErrorState title="Failed to load contract" message={error?.message || "Contract not found"} onRetry={() => refetch()} />
        </View>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen scroll={false}>
      {renderHeader()}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarHeight + 18 }}>
        <View style={styles.content}>
          <LinearGradient
            colors={[palette.accentSoft, palette.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: palette.borderLight }]}
          >
            <View style={styles.heroTopRow}>
              <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                <T weight="medium" color={status.tone} style={styles.statusPillText}>
                  {status.label}
                </T>
              </View>
              <View style={[styles.idPill, { backgroundColor: palette.border }]}>
                <T weight="regular" color={palette.subText} style={styles.idText}>
                  #{contract.id.slice(0, 8)}
                </T>
              </View>
            </View>

            <T weight="medium" color={palette.text} style={styles.heroTitle} numberOfLines={2}>
              {gig?.title || "Contract Project"}
            </T>
            <T weight="regular" color={palette.subText} style={styles.heroSubtitle} numberOfLines={1}>
              Created {formatDateLabel(contract.created_at)}
            </T>

            <View style={styles.personRow}>
              <Avatar source={counterpartyAvatar || undefined} size={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.personName} numberOfLines={1}>
                  {counterpartyName}
                </T>
                <T weight="regular" color={palette.subText} style={styles.personMeta} numberOfLines={1}>
                  {counterpartyRole} • Counterparty
                </T>
              </View>
              <View style={[styles.syncPill, { backgroundColor: palette.borderLight }]}>
                <T weight="regular" color={palette.subText} style={styles.syncPillText}>
                  {counterpartyProfile?.source === "tribe" ? "Profile synced" : "Profile fallback"}
                </T>
              </View>
            </View>

            <View style={styles.progressHead}>
              <T weight="regular" color={palette.subText} style={styles.progressLabel}>Contract Progress</T>
              <T weight="medium" color={palette.text} style={styles.progressValue}>{progress}%</T>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: status.tone }]} />
            </View>
          </LinearGradient>

          <View style={styles.metricGrid}>
            <View style={styles.metricRow}>
              <SurfaceCard style={styles.metricCard}>
                <T weight="regular" color={palette.subText} style={styles.metricLabel}>Contract Value</T>
                <T weight="medium" color={palette.text} style={styles.metricValue}>
                  {contractValueText}
                </T>
              </SurfaceCard>
              <SurfaceCard style={styles.metricCard}>
                <T weight="regular" color={palette.subText} style={styles.metricLabel}>Started</T>
                <T weight="medium" color={palette.text} style={styles.metricValue}>
                  {formatDateLabel(contract.started_at)}
                </T>
              </SurfaceCard>
            </View>
            <View style={styles.metricRow}>
              <SurfaceCard style={styles.metricCard}>
                <T weight="regular" color={palette.subText} style={styles.metricLabel}>Timeline</T>
                <T weight="medium" color={palette.text} style={styles.metricValue}>
                  {formatTimeline(parsedContent.timelineValue, parsedContent.timelineUnit)}
                </T>
              </SurfaceCard>
              <SurfaceCard style={styles.metricCard}>
                <T weight="regular" color={palette.subText} style={styles.metricLabel}>Work Mode</T>
                <T weight="medium" color={palette.text} style={styles.metricValue}>
                  {gig?.is_remote ? "Remote" : gig?.location_text || "On-site"}
                </T>
              </SurfaceCard>
            </View>
            <View style={styles.metricRow}>
              <SurfaceCard style={styles.metricCard}>
                <T weight="regular" color={palette.subText} style={styles.metricLabel}>Freelancer Submission</T>
                <T weight="medium" color={palette.text} style={styles.metricValue}>
                  {formatFlagLabel(milestones.submitted)}
                </T>
              </SurfaceCard>
              <SurfaceCard style={styles.metricCard}>
                <T weight="regular" color={palette.subText} style={styles.metricLabel}>Founder Approval</T>
                <T weight="medium" color={palette.text} style={styles.metricValue}>
                  {formatFlagLabel(milestones.approved)}
                </T>
              </SurfaceCard>
            </View>
          </View>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>Project Overview</T>
            <T weight="regular" color={palette.subText} style={styles.sectionBody}>
              {projectOverviewText}
            </T>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>Deliverables</T>
            {parsedContent.deliverables.length > 0 ? (
              parsedContent.deliverables.map((entry, index) => (
                <T key={`deliverable-${index}`} weight="regular" color={palette.subText} style={styles.sectionBody}>
                  - {entry}
                </T>
              ))
            ) : (
              <T weight="regular" color={palette.subText} style={styles.sectionBody}>
                No deliverables specified.
              </T>
            )}
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>Screening Questions</T>
            {parsedContent.screeningQuestions.length > 0 ? (
              parsedContent.screeningQuestions.map((entry, index) => (
                <T key={`question-${index}`} weight="regular" color={palette.subText} style={styles.sectionBody}>
                  {index + 1}. {entry}
                </T>
              ))
            ) : (
              <T weight="regular" color={palette.subText} style={styles.sectionBody}>
                No screening questions provided.
              </T>
            )}
          </SurfaceCard>

          {gigSkills.length > 0 ? (
            <SurfaceCard style={styles.card}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>Required Skills</T>
              <View style={styles.skillWrap}>
                {gigSkills.map((tag) => (
                  <View key={tag} style={[styles.skillTag, { backgroundColor: palette.borderLight }]}>
                    <T weight="regular" color={palette.subText} style={styles.skillText}>
                      {tag}
                    </T>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          ) : null}

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>Workflow</T>
            <View style={styles.timelineWrap}>
              {timelineRows.map((row) => (
                <View key={row.key} style={styles.timelineRow}>
                  <Ionicons
                    name={row.done ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={row.done ? "#34C759" : palette.subText}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T weight="medium" color={palette.text} style={styles.timelineTitle}>{row.label}</T>
                    <T weight="regular" color={palette.subText} style={styles.timelineSub}>{row.sub}</T>
                  </View>
                </View>
              ))}
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>Actions</T>
            <PrimaryButton
              label="Open Chat"
              icon="chatbubble-ellipses-outline"
              onPress={() =>
                router.push(
                  `/(role-pager)/(freelancer-tabs)/thread/${encodeURIComponent(contract.id)}?title=${encodeURIComponent(
                    counterpartyName,
                  )}&avatar=${encodeURIComponent(counterpartyAvatar || "")}` as any,
                )
              }
              style={{ marginTop: 10 }}
            />
            {!isFounderViewer && contract.status === "active" && !contract.freelancer_marked_complete ? (
              <PrimaryButton
                label="Submit Work as Complete"
                icon="checkmark-done-outline"
                onPress={handleComplete}
                loading={completeMutation.isPending}
                style={{ marginTop: 8 }}
              />
            ) : null}
            {contract.status === "completed" ? (
              <T weight="regular" color={palette.subText} style={styles.helperText}>
                Completed on {formatDateLabel(contract.completed_at)}
              </T>
            ) : null}
          </SurfaceCard>
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 9,
  },
  feedbackWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 10,
    lineHeight: 13,
  },
  idPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  idText: {
    fontSize: 10,
    lineHeight: 13,
  },
  heroTitle: {
    marginTop: 9,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  personRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  personName: {
    fontSize: 13,
    lineHeight: 17,
  },
  personMeta: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  syncPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syncPillText: {
    fontSize: 9,
    lineHeight: 12,
  },
  progressHead: {
    marginTop: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  progressValue: {
    fontSize: 11,
    lineHeight: 14,
  },
  progressTrack: {
    marginTop: 6,
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 7,
    borderRadius: 999,
  },
  metricGrid: {
    gap: 8,
  },
  metricRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    padding: 11,
  },
  metricLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  metricValue: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    padding: 13,
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  sectionBody: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 16,
  },
  skillWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skillTag: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  skillText: {
    fontSize: 10,
    lineHeight: 13,
  },
  timelineWrap: {
    marginTop: 8,
    gap: 9,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  timelineTitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  timelineSub: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  helperText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 15,
  },
});
