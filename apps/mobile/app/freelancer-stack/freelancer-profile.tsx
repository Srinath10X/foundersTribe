import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import StatusToggleSwitch from "@/components/StatusToggleSwitch";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useAuth } from "@/context/AuthContext";
import { useContracts, useCreateServiceRequest, useFreelancerServicesByUser, useUserTestimonials } from "@/hooks/useGig";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import type { Testimonial } from "@/types/gig";

const STORAGE_BUCKET = "tribe-media";

type PreviousWork = { company?: string; role?: string; duration?: string };
type SocialLink = { platform?: string; url?: string; label?: string };

type PublicProfileData = {
  id: string;
  display_name: string;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  user_type?: string | null;
  contact?: string | null;
  address?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  role?: string | null;
  previous_works?: PreviousWork[] | null;
  social_links?: SocialLink[] | null;
  completed_gigs?: { title?: string; description?: string }[] | null;
  updated_at?: string | null;
};

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

function compactLocation(raw: unknown): string | null {
  if (typeof raw === "string") {
    const value = raw.trim();
    return value.length > 0 ? value : null;
  }
  if (raw && typeof raw === "object") {
    const city = typeof (raw as any).city === "string" ? (raw as any).city.trim() : "";
    const state = typeof (raw as any).state === "string" ? (raw as any).state.trim() : "";
    const country = typeof (raw as any).country === "string" ? (raw as any).country.trim() : "";
    const line = [city, state, country].filter(Boolean).join(", ");
    return line.length > 0 ? line : null;
  }
  return null;
}

function socialLabel(item: SocialLink): string {
  const fallback = item.label || item.platform || "Link";
  const raw = String(item.url || "").trim();
  if (!raw) return fallback;
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = new URL(normalized).hostname.replace(/^www\./i, "");
    return item.label || host || fallback;
  } catch {
    return fallback;
  }
}

function SectionTitle({ color, title }: { color: string; title: string }) {
  const { palette } = useFlowPalette();

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionBar, { backgroundColor: color }]} />
      <T weight="bold" color={palette.subText} style={styles.sectionHeaderText}>
        {title}
      </T>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  onPress,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  onPress?: () => void;
  valueColor?: string;
}) {
  const { palette } = useFlowPalette();
  const isPressable = typeof onPress === "function";

  return (
    <TouchableOpacity activeOpacity={0.85} disabled={!isPressable} style={styles.detailRow} onPress={onPress}>
      <View style={styles.detailRowLeft}>
        <View style={[styles.detailIcon, { backgroundColor: palette.card }]}>
          <Ionicons name={icon} size={16} color="#9CA3AF" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T weight="medium" color={valueColor || palette.text} style={styles.detailValue} numberOfLines={2}>
            {value || "Not provided"}
          </T>
          <T weight="regular" color={palette.subText} style={styles.detailLabel}>
            {label}
          </T>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MoreRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string | null;
  onPress?: () => void;
}) {
  const { palette } = useFlowPalette();
  const isPressable = typeof onPress === "function";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!isPressable}
      style={[styles.moreRow]}
      onPress={onPress}
    >
      <View style={styles.moreRowLeft}>
        <View style={[styles.moreIcon, { backgroundColor: palette.card }]}>
          <Ionicons name={icon} size={16} color="#9CA3AF" />
        </View>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.moreTitle} numberOfLines={1}>
            {title}
          </T>
          {!!subtitle && (
            <T weight="regular" color={palette.subText} style={styles.moreSubtitle} numberOfLines={1}>
              {subtitle}
            </T>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function testimonialName(item: Testimonial) {
  return item.reviewer?.full_name || item.reviewer?.handle || "Member";
}

function testimonialDateLabel(value?: string | null) {
  if (!value) return "";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "";
  return new Date(ts).toLocaleDateString();
}

function testimonialAvatarSource(item: Testimonial): string | null {
  const raw = String(item.reviewer?.avatar_url || "").trim();
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : null;
}

export default function FreelancerProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { width: screenWidth } = useWindowDimensions();
  const { session } = useAuth();
  const { id, gigId, serviceId } = useLocalSearchParams<{ id?: string; gigId?: string; serviceId?: string }>();

  const { data: contractsData } = useContracts({ limit: 200 });
  const { data: freelancerServices = [] } = useFreelancerServicesByUser(
    typeof id === "string" ? id : "",
    Boolean(id),
  );
  const createServiceRequest = useCreateServiceRequest();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const testimonialScrollRef = React.useRef<ScrollView | null>(null);

  const targetUserId = (typeof id === "string" && id) || profile?.id || "";
  const { data: testimonials = [], refetch: refetchTestimonials } = useUserTestimonials(
    targetUserId,
    12,
    Boolean(targetUserId),
  );

  const loadProfile = useCallback(async () => {
    const profileId = typeof id === "string" ? id : "";
    if (!profileId || !session?.access_token) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let db: any = null;
      try {
        db = await tribeApi.getPublicProfile(session.access_token, profileId);
      } catch {
        const [{ data: tribeRow }, { data: gigRow }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
          supabase.from("user_profiles").select("*").eq("id", profileId).maybeSingle(),
        ]);
        if (tribeRow || gigRow) {
          db = { ...(gigRow || {}), ...(tribeRow || {}) };
        }
      }

      if (!db) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const resolvedAvatar =
        (await resolveAvatar(db?.photo_url || db?.avatar_url || null, profileId)) ||
        people.alex;

      const merged: PublicProfileData = {
        id: profileId,
        display_name: db?.display_name || db?.full_name || "Freelancer",
        username: db?.username || db?.handle || null,
        bio: db?.bio ?? null,
        avatar_url: resolvedAvatar,
        photo_url: resolvedAvatar,
        user_type: db?.user_type || "freelancer",
        contact: db?.contact ?? null,
        address: db?.address ?? null,
        location: compactLocation(db?.location),
        linkedin_url: db?.linkedin_url ?? null,
        role: db?.role ?? null,
        previous_works: Array.isArray(db?.previous_works) ? db.previous_works : [],
        social_links: Array.isArray(db?.social_links) ? db.social_links : [],
        completed_gigs: Array.isArray(db?.completed_gigs) ? db.completed_gigs : [],
        updated_at: db?.updated_at ?? null,
      };

      setProfile(merged);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id, session?.access_token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([loadProfile(), refetchTestimonials()]);
    setRefreshing(false);
  }, [loadProfile, refetchTestimonials]);

  const works = profile?.previous_works || [];
  const previousWorks = (Array.isArray(profile?.completed_gigs) ? profile.completed_gigs : []) || [];
  const links = (profile?.social_links || []).filter((x) => x?.url);

  const founderTestimonials = testimonials.filter((item) => {
    const role = String(item.reviewer?.role || "").toLowerCase();
    return role === "founder" || role === "both";
  });
  const testimonialItems = founderTestimonials.length > 0 ? founderTestimonials : testimonials;

  const contracts = contractsData?.items ?? [];
  const targetFreelancerId = (typeof id === "string" && id) || profile?.id || "";
  const linkedContract = contracts.find((contract) => {
    if (!contract) return false;
    if (!targetFreelancerId || contract.freelancer_id !== targetFreelancerId) return false;
    if (gigId && contract.gig_id !== gigId) return false;
    return contract.status === "active" || contract.status === "completed";
  });

  const preselectedService = freelancerServices.find((service) => service.id === serviceId)
    || freelancerServices[0]
    || null;
  const isFounderProfile = String(profile?.user_type || "").toLowerCase() === "founder";

  const openExternalUrl = async (url: string) => {
    const value = String(url || "").trim();
    if (!value) return;
    const safe = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const canOpen = await Linking.canOpenURL(safe);
    if (canOpen) {
      Linking.openURL(safe).catch(() => {});
    }
  };

  const sendServiceRequest = async (targetServiceId?: string) => {
    if (!profile?.id) return;
    const selectedService = freelancerServices.find((service) => service.id === targetServiceId) || null;
    const selectedServiceName = selectedService?.service_name?.trim() || "";
    const initialRequestMessage = selectedServiceName
      ? `Hi, I would like to discuss your ${selectedServiceName} service.`
      : "Hi, I would like to discuss your services.";
    try {
      await createServiceRequest.mutateAsync({
        freelancer_id: profile.id,
        service_id: targetServiceId || undefined,
        message: initialRequestMessage,
      });
      Alert.alert("Request sent", "Your request was sent. Freelancer can accept or reject it in their messages tab.");
    } catch (error: any) {
      Alert.alert("Request failed", error?.message || "Could not send message request");
    }
  };

  const canSlideTestimonials = testimonialItems.length > 1;
  const testimonialCardWidth = Math.max(260, screenWidth - 72);

  if (loading) {
    return (
      <FlowScreen>
        <View style={[styles.headerWithBack, { borderBottomColor: palette.borderLight, backgroundColor: palette.surface }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <T weight="semiBold" color={palette.text} style={styles.pageTitle}>
            Freelancer Profile
          </T>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingWrap}>
          <SurfaceCard style={styles.sectionCard}><LoadingState rows={2} /></SurfaceCard>
          <SurfaceCard style={styles.sectionCard}><LoadingState rows={3} /></SurfaceCard>
          <SurfaceCard style={styles.sectionCard}><LoadingState rows={3} /></SurfaceCard>
        </View>
      </FlowScreen>
    );
  }

  if (!profile) {
    return (
      <FlowScreen>
        <View style={[styles.headerWithBack, { borderBottomColor: palette.borderLight, backgroundColor: palette.surface }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <T weight="semiBold" color={palette.text} style={styles.pageTitle}>
            Freelancer Profile
          </T>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingWrap}>
          <ErrorState title="Freelancer not found" message="The profile couldn't be loaded." onRetry={loadProfile} />
        </View>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.headerWithBack, { borderBottomColor: palette.borderLight, backgroundColor: palette.surface }]}> 
        <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
          <Ionicons name="arrow-back" size={15} color={palette.text} />
        </TouchableOpacity>
        <T weight="semiBold" color={palette.text} style={styles.pageTitle}>
          Freelancer Profile
        </T>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.heroFixedWrap}>
        <View style={styles.heroCard}>
          <View style={styles.heroDotOverlay} />
          <View style={styles.heroPatternA} />
          <View style={styles.heroPatternB} />
          <View style={styles.heroPatternC} />
          <View style={styles.heroPatternD} />

          <View style={styles.heroTop}>
            <View style={styles.avatarSection}>
              <View style={styles.heroAvatarRing}>
                <Avatar source={profile.photo_url || people.alex} size={60} />
                <View style={styles.statusDot} />
              </View>
            </View>
            <View style={styles.heroIdentityText}>
              <T weight="semiBold" color="#FFFFFF" style={styles.heroName} numberOfLines={2}>
                {profile.display_name || "Freelancer"}
              </T>
              <T weight="regular" color="rgba(255,255,255,0.8)" style={styles.heroMeta} numberOfLines={1}>
                @{profile.username || "user"}
              </T>
              {profile.role && (
                <T weight="regular" color="rgba(255,255,255,0.7)" style={styles.heroRole} numberOfLines={1}>
                  {profile.role}
                </T>
              )}
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusToggleWrap}>
              <T
                weight="semiBold"
                color={availabilityEnabled ? "#FFFFFF" : "rgba(255,255,255,0)"}
                style={styles.statusToggleLabel}
              >
                {isFounderProfile ? "Open to Hire" : "Open to Work"}
              </T>
              <StatusToggleSwitch value={availabilityEnabled} onValueChange={setAvailabilityEnabled} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={[styles.quickActionBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
              onPress={() => {
                if (linkedContract) {
                  nav.push(
                    `/freelancer-stack/contract-chat-thread?contractId=${linkedContract.id}&title=${encodeURIComponent(
                      `${profile.display_name} • Contract Chat`,
                    )}`,
                  );
                  return;
                }
                if (preselectedService) {
                  sendServiceRequest(preselectedService.id);
                  return;
                }
                Alert.alert("No Service", "This freelancer has not listed services yet.");
              }}
              disabled={createServiceRequest.isPending}
            >
              <Ionicons name={linkedContract ? "chatbubble-ellipses-outline" : "paper-plane-outline"} size={17} color="#E23744" />
              <T weight="medium" color={palette.text} style={styles.quickActionText}>
                {linkedContract ? "Open Chat" : createServiceRequest.isPending ? "Sending..." : "Send Request"}
              </T>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              style={[styles.quickActionBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
              onPress={() => {
                if (profile.linkedin_url) {
                  openExternalUrl(profile.linkedin_url);
                }
              }}
              disabled={!profile.linkedin_url}
            >
              <Ionicons name="logo-linkedin" size={17} color={palette.text} />
              <T weight="medium" color={palette.text} style={styles.quickActionText}>
                {profile.linkedin_url ? "LinkedIn" : "No LinkedIn"}
              </T>
            </TouchableOpacity>
          </View>

          <View style={styles.blockWrap}>
            <SectionTitle color="#E23744" title="Personal Details" />
            <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
              <DetailRow icon="call-outline" label="Phone" value={profile.contact} />
              <DetailRow icon="home-outline" label="Address" value={profile.address} />
              <DetailRow icon="location-outline" label="Location" value={profile.location} />
              <DetailRow
                icon="link-outline"
                label="LinkedIn"
                value={profile.linkedin_url}
                valueColor={profile.linkedin_url ? "#3B82F6" : undefined}
                onPress={profile.linkedin_url ? () => openExternalUrl(profile.linkedin_url || "") : undefined}
              />
              <DetailRow icon="briefcase-outline" label="Role" value={profile.role} />
            </SurfaceCard>
          </View>

          <View style={styles.blockWrap}>
            <SectionTitle color="#3B82F6" title="Experience" />
            <SurfaceCard style={styles.sectionCard}>
              {works.length === 0 ? (
                <T weight="regular" color={palette.subText} style={styles.emptyText}>
                  No experience items added yet.
                </T>
              ) : (
                works.slice(0, 4).map((work, index) => {
                  const duration = work.duration || "Duration";
                  const isCurrent = /present|current/i.test(duration);
                  return (
                    <View key={`${work.company || "work"}-${index}`} style={styles.workCard}>
                      <View style={[styles.workIconWrap, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                        <Ionicons name="code-slash-outline" size={18} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T weight="semiBold" color={palette.text} style={styles.workRole} numberOfLines={1}>
                          {work.role || "Role"}
                        </T>
                        <T weight="regular" color={palette.subText} style={styles.workCompany} numberOfLines={1}>
                          {work.company || "Company"}
                        </T>
                        <View style={styles.workMetaRow}>
                          {isCurrent ? (
                            <View style={styles.currentTag}>
                              <T weight="medium" color="#2F9254" style={styles.currentTagText}>
                                Current
                              </T>
                            </View>
                          ) : null}
                          <T weight="regular" color="#9CA3AF" style={styles.workDuration} numberOfLines={1}>
                            {duration}
                          </T>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </SurfaceCard>
          </View>

          <View style={styles.blockWrap}>
            <SectionTitle color="#0EA5E9" title="Previous Works" />
            <SurfaceCard style={styles.sectionCard}>
              <View style={styles.sectionStack}>
                {previousWorks.length === 0 ? (
                  <T weight="regular" color={palette.subText} style={styles.emptyText}>
                    No previous works added yet.
                  </T>
                ) : (
                  previousWorks.slice(0, 5).map((work, index) => (
                    <View
                      key={`prev-${index}`}
                      style={[
                        styles.previousWorkCard,
                        { borderColor: palette.borderLight, backgroundColor: palette.card },
                      ]}
                    >
                      <View style={styles.previousWorkHead}>
                        <View style={styles.previousWorkHeadLeft}>
                          <View style={[styles.previousWorkIconWrap, { backgroundColor: "rgba(14, 165, 233, 0.14)" }]}>
                            <Ionicons name="briefcase-outline" size={15} color="#0EA5E9" />
                          </View>
                          <View style={[styles.previousWorkIndexTag, { borderColor: "rgba(14, 165, 233, 0.3)" }]}>
                            <T weight="bold" color="#0EA5E9" style={styles.previousWorkIndexText}>
                              Work {index + 1}
                            </T>
                          </View>
                        </View>
                      </View>

                      <T weight="semiBold" color={palette.text} style={styles.previousWorkTitle} numberOfLines={2}>
                        {String(work?.title || "Work")}
                      </T>
                      <T weight="regular" color={palette.subText} style={styles.previousWorkDesc} numberOfLines={4}>
                        {String(work?.description || "Description")}
                      </T>
                    </View>
                  ))
                )}
              </View>
            </SurfaceCard>
          </View>

          <View style={styles.blockWrap}>
            <SectionTitle color="#F59E0B" title="Testimonials" />
            <SurfaceCard style={styles.sectionCard}>
              {testimonialItems.length === 0 ? (
                <T weight="regular" color={palette.subText} style={styles.emptyText}>
                  No founder reviews yet.
                </T>
              ) : (
                <View style={styles.testimonialCarouselWrap}>
                  <ScrollView
                    ref={testimonialScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={canSlideTestimonials}
                    contentContainerStyle={styles.testimonialScroll}
                  >
                    {testimonialItems.slice(0, 12).map((item) => {
                      const reviewer = testimonialName(item);
                      const avatarSource = testimonialAvatarSource(item);
                      const gigTitle = item.contract?.gig?.title || "Project";
                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.testimonialItemCard,
                            { width: testimonialCardWidth },
                            { borderColor: palette.borderLight, backgroundColor: palette.surface },
                          ]}
                        >
                          <View style={styles.testimonialItemHead}>
                            <View style={styles.testimonialPersonRow}>
                              {avatarSource ? (
                                <Avatar source={avatarSource} size={32} />
                              ) : (
                                <View style={[styles.testimonialInitial, { backgroundColor: palette.accentSoft }]}> 
                                  <T weight="semiBold" color={palette.accent} style={styles.testimonialInitialText}>
                                    {reviewer.slice(0, 1).toUpperCase() || "U"}
                                  </T>
                                </View>
                              )}
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <T weight="semiBold" color={palette.text} style={styles.testimonialReviewer} numberOfLines={1}>
                                  {reviewer}
                                </T>
                                <T weight="regular" color={palette.subText} style={styles.testimonialMeta} numberOfLines={1}>
                                  {gigTitle}
                                </T>
                              </View>
                            </View>
                            <T weight="regular" color={palette.subText} style={styles.testimonialMeta}>
                              {testimonialDateLabel(item.created_at)}
                            </T>
                          </View>

                          <View style={styles.testimonialStars}>
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Ionicons
                                key={`${item.id}-star-${idx}`}
                                name={idx < Number(item.score || 0) ? "star" : "star-outline"}
                                size={13}
                                color={idx < Number(item.score || 0) ? "#F4C430" : palette.subText}
                              />
                            ))}
                          </View>

                          <T weight="regular" color={palette.text} style={styles.testimonialText} numberOfLines={5}>
                            {item.review_text || "Great collaboration and delivery."}
                          </T>
                        </View>
                      );
                    })}
                  </ScrollView>

                </View>
              )}
            </SurfaceCard>
          </View>

          <View style={styles.blockWrap}>
            <SectionTitle color="#10B981" title="Social Links" />
            <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
              {links.length === 0 ? (
                <MoreRow icon="globe-outline" title="No social links added" subtitle="Add links to profile" />
              ) : (
                links.slice(0, 6).map((item, index) => (
                  <MoreRow
                    key={`${item.platform || "link"}-${index}`}
                    icon="globe-outline"
                    title={item.label || item.platform || "Link"}
                    subtitle={socialLabel(item)}
                    onPress={() => openExternalUrl(String(item.url || ""))}
                  />
                ))
              )}
            </SurfaceCard>
          </View>

          <View style={{ height: 22 }} />
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  headerWithBack: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  pageTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  heroFixedWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  loadingWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 20,
  },
  heroDotOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  heroPatternA: {
    position: "absolute",
    right: -30,
    top: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(239, 68, 68, 0.28)",
  },
  heroPatternB: {
    position: "absolute",
    left: -60,
    bottom: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(59, 130, 246, 0.24)",
  },
  heroPatternC: {
    position: "absolute",
    right: 18,
    top: 28,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(245, 158, 11, 0.16)",
  },
  heroPatternD: {
    position: "absolute",
    left: 24,
    bottom: 18,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarSection: {
    width: 64,
    height: 64,
  },
  heroAvatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#121826",
  },
  heroIdentityText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  heroName: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  heroMeta: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 14,
  },
  heroRole: {
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 13,
  },
  statusRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  statusToggleWrap: {
    minWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    flexDirection: "column",
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  statusToggleLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
  },
  quickActionText: {
    fontSize: 13,
    lineHeight: 16,
  },
  blockWrap: {
    gap: 8,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionBar: {
    width: 4,
    height: 16,
    borderRadius: 999,
  },
  sectionHeaderText: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
  },
  listCard: {
    paddingVertical: 4,
    gap: 0,
  },
  sectionStack: {
    marginTop: 10,
    gap: 10,
  },
  detailRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  detailRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  detailValue: {
    fontSize: 13,
    lineHeight: 17,
  },
  detailLabel: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  servicesStack: {
    marginTop: 10,
    gap: 8,
  },
  serviceRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serviceName: {
    fontSize: 12,
    lineHeight: 16,
  },
  serviceMeta: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  requestBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requestBtnText: {
    fontSize: 10,
    lineHeight: 13,
  },
  workCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  workIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  workRole: {
    fontSize: 12,
    lineHeight: 16,
  },
  workCompany: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  workMetaRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentTag: {
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 120, 0.15)",
    paddingHorizontal: 8,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  currentTagText: {
    fontSize: 10,
    lineHeight: 13,
  },
  workDuration: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  previousWorkCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  previousWorkHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  previousWorkHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previousWorkIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  previousWorkIndexTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    height: 22,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(14,165,233,0.08)",
  },
  previousWorkIndexText: {
    fontSize: 9.5,
    lineHeight: 12,
    textTransform: "uppercase",
  },
  previousWorkTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  previousWorkDesc: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
  },
  testimonialCarouselWrap: {
    position: "relative",
  },
  testimonialScroll: {
    marginTop: 6,
    paddingHorizontal: 18,
    gap: 8,
  },
  testimonialItemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    gap: 8,
  },
  testimonialItemHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  testimonialPersonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  testimonialInitial: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialInitialText: {
    fontSize: 12,
    lineHeight: 15,
  },
  testimonialReviewer: {
    fontSize: 12,
    lineHeight: 16,
  },
  testimonialMeta: {
    fontSize: 10,
    lineHeight: 13,
  },
  testimonialStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  testimonialText: {
    fontSize: 11,
    lineHeight: 16,
  },
  moreRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
  },
  moreRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  moreIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  moreTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  moreSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  emptyLine: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 14,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 14,
  },
});
