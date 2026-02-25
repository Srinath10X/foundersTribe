import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { ReactNode } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
  ActivityIndicator,
} from "react-native";

import { Layout, Spacing, Typography } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";
import { SP, RADIUS, SHADOWS } from "@/components/freelancer/designTokens";

export type FlowPalette = {
  bg: string;
  surface: string;
  card: string;
  border: string;
  borderLight: string;
  text: string;
  subText: string;
  mutedText: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  navBg: string;
};

export function useFlowPalette(): { palette: FlowPalette; isDark: boolean } {
  const { theme, isDark } = useTheme();

  return {
    isDark,
    palette: {
      bg: theme.background,
      surface: theme.surface,
      card: theme.surfaceElevated,
      border: theme.border,
      borderLight: theme.borderLight,
      text: theme.text.primary,
      subText: theme.text.secondary,
      mutedText: theme.text.tertiary,
      accent: theme.brand.primary,
      accentSoft: isDark ? "rgba(255,59,48,0.22)" : "rgba(255,59,48,0.12)",
      success: theme.success,
      warning: theme.warning,
      navBg: theme.surface,
    },
  };
}

export const poppins = {
  regular: "Poppins_400Regular",
  medium: "Poppins_400Regular",
  semiBold: "Poppins_500Medium",
  bold: "Poppins_600SemiBold",
};

export function T({
  children,
  style,
  color,
  weight = "regular",
  ...textProps
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
  weight?: "regular" | "medium" | "semiBold" | "bold";
} & TextProps) {
  const flat = StyleSheet.flatten(style) || {};
  const explicitSize = typeof flat.fontSize === "number" ? flat.fontSize : undefined;
  const explicitLineHeight = typeof flat.lineHeight === "number" ? flat.lineHeight : undefined;

  const resolvedSize = explicitSize ?? Typography.sizes.md;
  const computedLineHeight =
    explicitLineHeight ??
    (resolvedSize <= Typography.sizes.xxs
      ? Typography.lineHeights.xxs
      : resolvedSize <= Typography.sizes.xs
        ? Typography.lineHeights.xs
        : resolvedSize <= Typography.sizes.sm
          ? Typography.lineHeights.sm
          : resolvedSize <= Typography.sizes.md
            ? Typography.lineHeights.md
            : resolvedSize <= Typography.sizes.lg
              ? Typography.lineHeights.lg
              : resolvedSize <= Typography.sizes.xl
                ? Typography.lineHeights.xl
                : resolvedSize <= Typography.sizes.xxl
                  ? Typography.lineHeights.xxl
                  : Typography.lineHeights.xxxl);

  return (
    <Text
      maxFontSizeMultiplier={1}
      {...textProps}
      style={[
        {
          fontFamily: poppins[weight],
          color,
          fontSize: resolvedSize,
          lineHeight: computedLineHeight,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function FlowScreen({
  children,
  scroll = true,
  style,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}) {
  const { palette, isDark } = useFlowPalette();

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }, style]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer}
    </View>
  );
}

export function FlowTopBar({
  title,
  left = "arrow-back",
  right,
  onLeftPress,
  onRightPress,
  divider = true,
  showLeft = true,
}: {
  title: string;
  left?: keyof typeof Ionicons.glyphMap;
  right?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  divider?: boolean;
  showLeft?: boolean;
}) {
  const { palette } = useFlowPalette();

  return (
    <View
      style={[
        styles.topBar,
        {
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: palette.borderLight,
          backgroundColor: palette.surface,
        },
      ]}
    >
      {showLeft ? (
        <TouchableOpacity onPress={onLeftPress} style={styles.iconBtn}>
          <Ionicons name={left} size={22} color={palette.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}
      <T weight="semiBold" color={palette.text} style={styles.topBarTitle}>
        {title}
      </T>
      <TouchableOpacity onPress={onRightPress} style={styles.iconBtn}>
        {right ? <Ionicons name={right} size={22} color={palette.text} /> : <View style={{ width: 22 }} />}
      </TouchableOpacity>
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useFlowPalette();

  return (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderColor: palette.borderLight,
          borderWidth: 1,
          borderRadius: RADIUS.lg,
          padding: SP._16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "progress" | "neutral" | "danger";
}) {
  const { palette, isDark } = useFlowPalette();
  const byTone = {
    success: {
      bg: isDark ? "rgba(95,168,118,0.24)" : "rgba(95,168,118,0.14)",
      text: palette.success,
    },
    progress: {
      bg: isDark ? "rgba(116,165,212,0.24)" : "rgba(116,165,212,0.14)",
      text: "#6091C7",
    },
    neutral: {
      bg: isDark ? "rgba(150,155,170,0.22)" : "#ECEFF4",
      text: isDark ? "#C8CBD6" : "#6D7688",
    },
    danger: {
      bg: palette.accentSoft,
      text: palette.accent,
    },
  } as const;

  return (
    <View style={{ backgroundColor: byTone[tone].bg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 }}>
      <T style={{ fontSize: 12, letterSpacing: 0.7, textTransform: "uppercase" }} weight="semiBold" color={byTone[tone].text}>
        {label}
      </T>
    </View>
  );
}

export function GhostButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useFlowPalette();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        {
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: Layout.radius.md,
          paddingVertical: 12,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: palette.surface,
        },
        style,
      ]}
    >
      <T weight="semiBold" color={palette.subText} style={{ fontSize: 15 }}>
        {label}
      </T>
    </TouchableOpacity>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useFlowPalette();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || loading || !onPress}
      style={[
        {
          backgroundColor: palette.accent,
          borderRadius: RADIUS.md,
          paddingVertical: 14,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
          gap: 8,
          opacity: disabled || !onPress ? 0.55 : 1,
        },
        Layout.shadows.lg,
        style,
      ]}
    >
      {loading ? (
        <React.Fragment>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <T weight="bold" color="#FFFFFF" style={{ fontSize: 16 }}>
            {label}
          </T>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <T weight="bold" color="#FFFFFF" style={{ fontSize: 16 }}>
            {label}
          </T>
          {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
        </React.Fragment>
      )}
    </TouchableOpacity>
  );
}

export function BottomMiniNav({ activeLabel }: { activeLabel: "home" | "feed" | "create" | "chat" | "profile"; }) {
  const { palette, isDark } = useFlowPalette();
  const router = useRouter();
  type NavKey = "home" | "feed" | "create" | "chat" | "profile";
  type NavItem = { key: NavKey; icon: keyof typeof Ionicons.glyphMap; label: string; route: string; isCenter?: boolean };

  const navItems: NavItem[] = [
    { key: "home", icon: "home", label: "Home", route: "/freelancer-stack" },
    { key: "feed", icon: "newspaper", label: "Feed", route: "/freelancer-stack/feed" },
    { key: "create", icon: "add-circle", label: "Post", route: "/freelancer-stack/post-gig", isCenter: true },
    { key: "chat", icon: "chatbubble", label: "Chat", route: "/freelancer-stack/contract-chat" },
    { key: "profile", icon: "person-circle", label: "Profile", route: "/freelancer-stack/founder-profile" },
  ];

  const glassBackground = isDark
    ? "rgba(18, 18, 22, 0.65)"
    : "rgba(255, 255, 255, 0.62)";

  const barBottom = Platform.OS === "ios" ? 28 : 18;

  return (
    <View style={[styles.bottomNavContainer, { bottom: barBottom }]}>
      <View
        style={[
          styles.bottomNavGlass,
          {
            shadowColor: isDark ? "#000" : "rgba(0,0,0,0.35)",
            shadowOffset: { width: 0, height: isDark ? 8 : 12 },
            shadowOpacity: isDark ? 0.4 : 1,
            shadowRadius: isDark ? 24 : 32,
            elevation: 12,
            borderColor: isDark ? "rgba(255,255,255,0.10)" : "transparent",
          },
        ]}
      >
        <BlurView
          intensity={Platform.OS === "ios" ? 80 : 100}
          tint={isDark ? "dark" : "light"}
          style={[StyleSheet.absoluteFillObject, { backgroundColor: glassBackground, borderRadius: 40 }]}
        />
        <LinearGradient
          colors={
            isDark
              ? ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)", "rgba(0,0,0,0.0)", "rgba(0,0,0,0.06)"]
              : ["rgba(255,255,255,0.45)", "rgba(255,255,255,0.10)", "rgba(0,0,0,0.0)", "rgba(0,0,0,0.05)"]
          }
          locations={[0, 0.25, 0.55, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.bottomNav}>
          {navItems.map((item) => {
            const active = item.key === activeLabel;
            const isCenter = item.isCenter;

            return (
              <TouchableOpacity
                key={item.key}
                style={styles.navItem}
                activeOpacity={0.85}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                onPress={() => router.replace(item.route as never)}
              >
                {isCenter ? (
                  <View style={styles.centerItemContainer}>
                    <View style={[styles.centerIconBg, { backgroundColor: palette.accent }]}>
                      <Ionicons name="add" size={22} color="#fff" />
                    </View>
                  </View>
                ) : (
                  <Ionicons name={item.icon} size={22} color={active ? palette.accent : palette.mutedText} />
                )}
                <T
                  weight={active ? "semiBold" : "medium"}
                  color={isCenter ? palette.mutedText : (active ? palette.accent : palette.mutedText)}
                  style={{ fontSize: 9, marginTop: 4 }}
                >
                  {item.label}
                </T>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function BottomTalentNav({
  activeLabel,
}: {
  activeLabel: "dashboard" | "gigs" | "contracts" | "messages" | "profile";
}) {
  const { palette } = useFlowPalette();
  const router = useRouter();
  type NavKey = "dashboard" | "gigs" | "contracts" | "messages" | "profile";
  type NavItem = { key: NavKey; icon: keyof typeof Ionicons.glyphMap; label: string; route: string };

  const navItems: NavItem[] = [
    { key: "dashboard", icon: "grid", label: "Dashboard", route: "/talent-stack" },
    { key: "gigs", icon: "briefcase", label: "Gigs", route: "/talent-stack/browse-gigs" },
    { key: "messages", icon: "chatbubble", label: "Messages", route: "/talent-stack/messages" },
    { key: "profile", icon: "person-circle", label: "Profile", route: "/talent-stack/profile" },
  ];

  return (
    <View style={[styles.bottomNav, { backgroundColor: palette.navBg, borderTopColor: palette.borderLight }]}>
      <View style={styles.navTopDivider} />
      {navItems.map((item) => {
        const active = item.key === activeLabel;
        return (
          <TouchableOpacity
            key={item.label}
            style={styles.navItem}
            activeOpacity={0.85}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => router.replace(item.route as never)}
          >
            <Ionicons name={item.icon} size={21} color={active ? palette.accent : palette.mutedText} />
            <T
              weight={active ? "semiBold" : "medium"}
              color={active ? palette.accent : palette.mutedText}
              style={{ fontSize: 11, marginTop: 4 }}
            >
              {item.label}
            </T>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Avatar({
  source,
  size = 48,
}: {
  source?: string | { uri: string };
  size?: number;
}) {
  const uri = typeof source === "string" ? source : source?.uri;
  return (
    <Image
      source={uri ? { uri } : undefined}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
    />
  );
}

export function useFlowNav() {
  const router = useRouter();

  return {
    push: (path: string) => router.push(path as never),
    replace: (path: string) => router.replace(path as never),
    back: () => router.back(),
  };
}

export const people = {
  alex: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&q=80",
  sarah: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80",
  jordan: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80",
  marcus: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=300&q=80",
  david: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80",
  female1: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80",
  female2: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&q=80",
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  topBar: {
    paddingTop: Platform.OS === "ios" ? 58 : 36,
    paddingBottom: 12,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
  },
  bottomNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 22 : 14,
  },
  bottomNavContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 94,
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 50,
  },
  bottomNavGlass: {
    width: "92%",
    height: 78,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  navTopDivider: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerItemContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
