import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
} from "react-native";

import { Layout, Spacing, Typography } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";

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
  medium: "Poppins_500Medium",
  semiBold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
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
          backgroundColor: palette.card,
          borderColor: palette.borderLight,
          borderWidth: 1,
          borderRadius: Layout.radius.lg,
          ...Layout.shadows.sm,
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
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useFlowPalette();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        {
          backgroundColor: palette.accent,
          borderRadius: Layout.radius.md,
          paddingVertical: 14,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
          gap: 8,
        },
        Layout.shadows.lg,
        style,
      ]}
    >
      <T weight="bold" color="#FFFFFF" style={{ fontSize: 16 }}>
        {label}
      </T>
      {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
    </TouchableOpacity>
  );
}

export function BottomMiniNav({ activeLabel }: { activeLabel: "home" | "my gigs" | "create" | "chat" | "profile"; }) {
  const { palette, isDark } = useFlowPalette();
  const router = useRouter();
  type NavKey = "home" | "my gigs" | "create" | "chat" | "profile";
  type NavItem = { key: NavKey; icon: keyof typeof Ionicons.glyphMap; label: string; route: string };

  const navItems: NavItem[] = [
    { key: "home", icon: "home", label: "Home", route: "/freelancer-stack" },
    { key: "my gigs", icon: "briefcase", label: "My Gigs", route: "/freelancer-stack/my-gigs" },
    { key: "create", icon: "add", label: "Post", route: "/freelancer-stack/post-gig" },
    { key: "chat", icon: "chatbubble", label: "Chat", route: "/freelancer-stack/contract-chat" },
    { key: "profile", icon: "person-circle", label: "Profile", route: "/freelancer-stack/founder-profile" },
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
            activeOpacity={0.8}
            onPress={() => router.replace(item.route as never)}
          >
            {item.key === "create" ? (
              <>
                <View style={[styles.createPill, { backgroundColor: palette.accent, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }]}>
                  <Ionicons name="add" size={24} color="#fff" />
                </View>
                <T weight="semiBold" color={palette.accent} style={{ fontSize: 11, marginTop: 2 }}>
                  {item.label}
                </T>
              </>
            ) : (
              <>
                <Ionicons name={item.icon} size={22} color={active ? palette.accent : palette.mutedText} />
                <T
                  weight={active ? "semiBold" : "medium"}
                  color={active ? palette.accent : palette.mutedText}
                  style={{ fontSize: 11, marginTop: 4 }}
                >
                  {item.label}
                </T>
              </>
            )}
          </TouchableOpacity>
        );
      })}
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
            activeOpacity={0.8}
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
  source: string;
  size?: number;
}) {
  return (
    <Image
      source={{ uri: source }}
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    flexDirection: "row",
    justifyContent: "space-between",
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
  createPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -16,
  },
});
