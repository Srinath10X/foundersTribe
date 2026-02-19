import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/context/ThemeContext";
import {
    FounderProfilePayload,
    FounderRole,
    LookingFor,
    FounderStage,
    Commitment,
    upsertFounderProfile,
} from "@/lib/founderMatchApi";
import { Typography, Spacing, Layout } from "@/constants/DesignSystem";

/* ================================================================= */
/*  Types                                                             */
/* ================================================================= */

interface Props {
    visible: boolean;
    onClose: () => void;
    onComplete: () => void;
    token: string;
}

/* ================================================================= */
/*  Constants                                                         */
/* ================================================================= */

const ROLES: { value: FounderRole; icon: string; label: string }[] = [
    { value: "tech", icon: "code-slash", label: "Technical" },
    { value: "business", icon: "briefcase", label: "Business" },
    { value: "design", icon: "color-palette", label: "Design" },
    { value: "growth", icon: "trending-up", label: "Growth" },
];

const LOOKING_FOR: { value: LookingFor; label: string }[] = [
    { value: "tech", label: "Technical Co-founder" },
    { value: "business", label: "Business Co-founder" },
    { value: "either", label: "Open to Either" },
];

const STAGES: { value: FounderStage; icon: string; label: string }[] = [
    { value: "idea", icon: "bulb", label: "Idea Stage" },
    { value: "mvp", icon: "rocket", label: "MVP Stage" },
    { value: "revenue", icon: "cash", label: "Revenue Stage" },
];

const COMMITMENTS: { value: Commitment; label: string }[] = [
    { value: "full_time", label: "Full-Time" },
    { value: "part_time", label: "Part-Time" },
    { value: "exploring", label: "Exploring" },
];

const INDUSTRY_OPTIONS = [
    "AI / ML",
    "FinTech",
    "HealthTech",
    "EdTech",
    "SaaS",
    "E-Commerce",
    "Social",
    "Marketplace",
    "Climate",
    "Gaming",
    "Dev Tools",
    "Crypto / Web3",
];

const SKILL_OPTIONS = [
    "frontend",
    "backend",
    "mobile",
    "devops",
    "ml-ai",
    "data-science",
    "product",
    "marketing",
    "sales",
    "design-ui",
    "fundraising",
    "strategy",
];

/* ================================================================= */
/*  Component                                                         */
/* ================================================================= */

export default function FounderMatchOnboarding({
    visible,
    onClose,
    onComplete,
    token,
}: Props) {
    const { theme } = useTheme();

    // Form state
    const [role, setRole] = useState<FounderRole | null>(null);
    const [lookingFor, setLookingFor] = useState<LookingFor | null>(null);
    const [stage, setStage] = useState<FounderStage | null>(null);
    const [commitment, setCommitment] = useState<Commitment | null>(null);
    const [industryTags, setIndustryTags] = useState<string[]>([]);
    const [skills, setSkills] = useState<string[]>([]);
    const [pitch, setPitch] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Current step (0-indexed)
    const [step, setStep] = useState(0);
    const totalSteps = 4;

    const toggleInArray = (arr: string[], item: string, setter: (a: string[]) => void) => {
        if (arr.includes(item)) {
            setter(arr.filter((i) => i !== item));
        } else {
            setter([...arr, item]);
        }
    };

    const canProceed = (): boolean => {
        switch (step) {
            case 0:
                return !!role && !!lookingFor;
            case 1:
                return !!stage && !!commitment;
            case 2:
                return industryTags.length >= 1 && skills.length >= 1;
            case 3:
                return pitch.length >= 10;
            default:
                return false;
        }
    };

    const handleSubmit = async () => {
        if (!role || !lookingFor || !stage || !commitment) return;
        setSaving(true);
        setError(null);
        try {
            const payload: FounderProfilePayload = {
                role,
                looking_for: lookingFor,
                stage,
                commitment,
                industry_tags: industryTags,
                skills,
                pitch_short: pitch,
            };
            await upsertFounderProfile(token, payload);
            onComplete();
        } catch (err: any) {
            setError(err.message || "Failed to save profile");
        } finally {
            setSaving(false);
        }
    };

    const handleNext = () => {
        if (step < totalSteps - 1) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    /* ── Render helpers ── */

    const ChoiceButton = ({
        selected,
        onPress,
        label,
        icon,
    }: {
        selected: boolean;
        onPress: () => void;
        label: string;
        icon?: string;
    }) => (
        <TouchableOpacity
            style={[
                styles.choiceBtn,
                {
                    backgroundColor: selected ? theme.brand.primary + "15" : theme.surfaceElevated,
                    borderColor: selected ? theme.brand.primary : theme.border,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {icon && (
                <Ionicons
                    name={icon as any}
                    size={20}
                    color={selected ? theme.brand.primary : theme.text.secondary}
                    style={{ marginRight: 8 }}
                />
            )}
            <Text
                style={[
                    styles.choiceLabel,
                    { color: selected ? theme.brand.primary : theme.text.primary },
                ]}
            >
                {label}
            </Text>
            {selected && (
                <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.brand.primary}
                    style={{ marginLeft: "auto" }}
                />
            )}
        </TouchableOpacity>
    );

    const ChipToggle = ({
        items,
        selected,
        onToggle,
        color,
    }: {
        items: string[];
        selected: string[];
        onToggle: (item: string) => void;
        color: string;
    }) => (
        <View style={styles.chipGrid}>
            {items.map((item) => {
                const isSelected = selected.includes(item);
                return (
                    <TouchableOpacity
                        key={item}
                        style={[
                            styles.chip,
                            {
                                backgroundColor: isSelected ? color + "15" : theme.surfaceElevated,
                                borderColor: isSelected ? color : theme.border,
                            },
                        ]}
                        onPress={() => onToggle(item)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                { color: isSelected ? color : theme.text.secondary },
                            ]}
                        >
                            {item}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <View>
                        <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                            What's your role?
                        </Text>
                        <Text style={[styles.stepSubtitle, { color: theme.text.tertiary }]}>
                            Choose the role that best describes you
                        </Text>
                        {ROLES.map((r) => (
                            <ChoiceButton
                                key={r.value}
                                selected={role === r.value}
                                onPress={() => setRole(r.value)}
                                label={r.label}
                                icon={r.icon}
                            />
                        ))}
                        <Text style={[styles.stepTitle, { color: theme.text.primary, marginTop: 20 }]}>
                            Looking for…
                        </Text>
                        {LOOKING_FOR.map((l) => (
                            <ChoiceButton
                                key={l.value}
                                selected={lookingFor === l.value}
                                onPress={() => setLookingFor(l.value)}
                                label={l.label}
                            />
                        ))}
                    </View>
                );
            case 1:
                return (
                    <View>
                        <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                            What stage are you at?
                        </Text>
                        {STAGES.map((s) => (
                            <ChoiceButton
                                key={s.value}
                                selected={stage === s.value}
                                onPress={() => setStage(s.value)}
                                label={s.label}
                                icon={s.icon}
                            />
                        ))}
                        <Text style={[styles.stepTitle, { color: theme.text.primary, marginTop: 20 }]}>
                            Your commitment level
                        </Text>
                        {COMMITMENTS.map((c) => (
                            <ChoiceButton
                                key={c.value}
                                selected={commitment === c.value}
                                onPress={() => setCommitment(c.value)}
                                label={c.label}
                            />
                        ))}
                    </View>
                );
            case 2:
                return (
                    <View>
                        <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                            Your industries
                        </Text>
                        <Text style={[styles.stepSubtitle, { color: theme.text.tertiary }]}>
                            Select at least one industry you're interested in
                        </Text>
                        <ChipToggle
                            items={INDUSTRY_OPTIONS}
                            selected={industryTags}
                            onToggle={(item) => toggleInArray(industryTags, item, setIndustryTags)}
                            color={theme.info}
                        />
                        <Text style={[styles.stepTitle, { color: theme.text.primary, marginTop: 20 }]}>
                            Your skills
                        </Text>
                        <Text style={[styles.stepSubtitle, { color: theme.text.tertiary }]}>
                            Pick at least one skill
                        </Text>
                        <ChipToggle
                            items={SKILL_OPTIONS}
                            selected={skills}
                            onToggle={(item) => toggleInArray(skills, item, setSkills)}
                            color={theme.success}
                        />
                    </View>
                );
            case 3:
                return (
                    <View>
                        <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                            Your elevator pitch
                        </Text>
                        <Text style={[styles.stepSubtitle, { color: theme.text.tertiary }]}>
                            10–200 characters. What are you building or looking to build?
                        </Text>
                        <TextInput
                            style={[
                                styles.textArea,
                                {
                                    backgroundColor: theme.surfaceElevated,
                                    borderColor: theme.border,
                                    color: theme.text.primary,
                                },
                            ]}
                            placeholder="e.g. Building an AI-powered recruiting platform for remote teams..."
                            placeholderTextColor={theme.text.muted}
                            multiline
                            maxLength={200}
                            value={pitch}
                            onChangeText={setPitch}
                            textAlignVertical="top"
                        />
                        <Text style={[styles.charCount, { color: theme.text.tertiary }]}>
                            {pitch.length}/200
                        </Text>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalOverlay}
            >
                <View
                    style={[
                        styles.modalContainer,
                        {
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    {/* Close button */}
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={24} color={theme.text.secondary} />
                    </TouchableOpacity>

                    {/* Progress */}
                    <View style={styles.progressRow}>
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.progressDot,
                                    {
                                        backgroundColor:
                                            i <= step ? theme.brand.primary : theme.border,
                                        flex: 1,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                        Set Up Matching Profile
                    </Text>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {renderStep()}
                    </ScrollView>

                    {error && (
                        <Text style={[styles.errorText, { color: theme.error }]}>
                            {error}
                        </Text>
                    )}

                    {/* Navigation */}
                    <View style={styles.navRow}>
                        {step > 0 && (
                            <TouchableOpacity
                                style={[styles.navBtn, { backgroundColor: theme.surfaceElevated }]}
                                onPress={() => setStep(step - 1)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="arrow-back" size={20} color={theme.text.secondary} />
                                <Text style={[styles.navBtnText, { color: theme.text.secondary }]}>
                                    Back
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.navBtn,
                                styles.navBtnPrimary,
                                {
                                    backgroundColor: canProceed()
                                        ? theme.brand.primary
                                        : theme.text.muted,
                                    flex: 1,
                                    marginLeft: step > 0 ? 8 : 0,
                                },
                            ]}
                            onPress={handleNext}
                            disabled={!canProceed() || saving}
                            activeOpacity={0.8}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Text style={[styles.navBtnText, { color: "#fff" }]}>
                                        {step === totalSteps - 1 ? "Start Matching" : "Continue"}
                                    </Text>
                                    <Ionicons
                                        name={step === totalSteps - 1 ? "flame" : "arrow-forward"}
                                        size={20}
                                        color="#fff"
                                        style={{ marginLeft: 4 }}
                                    />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/* ================================================================= */
/*  Styles                                                            */
/* ================================================================= */

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContainer: {
        borderTopLeftRadius: Layout.radius.xxl,
        borderTopRightRadius: Layout.radius.xxl,
        borderWidth: 1,
        borderBottomWidth: 0,
        maxHeight: "92%",
        paddingBottom: Platform.OS === "ios" ? 34 : 20,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
    },
    closeBtn: {
        position: "absolute",
        top: Spacing.md,
        right: Spacing.md,
        zIndex: 10,
        padding: 4,
    },
    progressRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: Spacing.sm,
        marginTop: 4,
    },
    progressDot: {
        height: 4,
        borderRadius: 2,
    },
    modalTitle: {
        ...Typography.presets.h2,
        marginBottom: Spacing.md,
    },
    scrollContent: {
        paddingBottom: Spacing.xl,
    },

    /* Steps */
    stepTitle: {
        ...Typography.presets.h3,
        marginBottom: 4,
    },
    stepSubtitle: {
        ...Typography.presets.bodySmall,
        marginBottom: Spacing.sm,
    },

    /* Choice buttons */
    choiceBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: Layout.radius.md,
        borderWidth: 1.5,
        marginBottom: 8,
    },
    choiceLabel: {
        ...Typography.presets.body,
        fontWeight: "600",
    },

    /* Chip grid */
    chipGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: Layout.radius.full,
        borderWidth: 1.5,
    },
    chipText: {
        ...Typography.presets.bodySmall,
        fontWeight: "600",
    },

    /* Text area */
    textArea: {
        borderWidth: 1.5,
        borderRadius: Layout.radius.md,
        padding: Spacing.sm,
        minHeight: 100,
        ...Typography.presets.body,
    },
    charCount: {
        ...Typography.presets.caption,
        textAlign: "right",
        marginTop: 4,
    },

    /* Error */
    errorText: {
        ...Typography.presets.bodySmall,
        textAlign: "center",
        marginBottom: 8,
    },

    /* Navigation */
    navRow: {
        flexDirection: "row",
        marginTop: Spacing.sm,
    },
    navBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        borderRadius: Layout.radius.md,
    },
    navBtnPrimary: {},
    navBtnText: {
        ...Typography.presets.body,
        fontWeight: "700",
    },
});
