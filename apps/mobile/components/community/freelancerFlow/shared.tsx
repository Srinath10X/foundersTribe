import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { ReactNode } from "react";
import {
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

import { Layout, Spacing } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";

export type FlowPalette = {
  bg: string;
  surface: string;
  card: string;
  border: string;
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
      card: isDark ? "#1A1B1F" : "#FFFFFF",
      border: theme.border,
      text: theme.text.primary,
      subText: theme.text.secondary,
      mutedText: theme.text.tertiary,
      accent: "#FF1B1C",
      accentSoft: isDark ? "rgba(255, 27, 28, 0.22)" : "rgba(255, 27, 28, 0.12)",
      success: isDark ? "#35D176" : "#129857",
      warning: "#F4C430",
      navBg: isDark ? "rgba(18,18,20,0.95)" : "rgba(255,255,255,0.95)",
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
  const scaled = typeof flat.fontSize === "number" ? flat.fontSize * 0.74 : undefined;
  const size = typeof scaled === "number" ? Math.max(10, Math.min(26, scaled)) : undefined;
  const line = typeof flat.lineHeight === "number" ? flat.lineHeight * 0.74 : undefined;

  return (
    <Text
      maxFontSizeMultiplier={1}
      {...textProps}
      style={[
        {
          fontFamily: poppins[weight],
          color,
        },
        size ? { fontSize: size } : null,
        line ? { lineHeight: line } : null,
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
          borderBottomColor: palette.border,
          backgroundColor: palette.bg,
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
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 16,
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
      bg: isDark ? "rgba(53,209,118,0.24)" : "#D8F6E6",
      text: palette.success,
    },
    progress: {
      bg: isDark ? "rgba(80,130,255,0.24)" : "#DFE9FF",
      text: "#2A63F6",
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
          borderRadius: 12,
          paddingVertical: 12,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: palette.surface,
        },
        style,
      ]}
    >
      <T weight="semiBold" color={palette.subText} style={{ fontSize: 17 }}>
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
          borderRadius: 14,
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
      <T weight="bold" color="#FFFFFF" style={{ fontSize: 18 }}>
        {label}
      </T>
      {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
    </TouchableOpacity>
  );
}

export function BottomMiniNav({ activeLabel }: { activeLabel: "home" | "my gigs" | "create" | "chat" | "profile"; }) {
  const { palette } = useFlowPalette();
  const router = useRouter();
  type NavKey = "home" | "my gigs" | "create" | "chat" | "profile";
  type NavItem = { key: NavKey; icon: keyof typeof Ionicons.glyphMap; label: string; route: string };

  const navItems: NavItem[] = [
    { key: "home", icon: "home", label: "Home", route: "/freelancer-stack" },
    { key: "my gigs", icon: "briefcase", label: "My Gigs", route: "/freelancer-stack/my-gigs" },
    { key: "create", icon: "add", label: "Post", route: "/freelancer-stack/post-gig" },
    { key: "chat", icon: "chatbubble", label: "Chat", route: "/freelancer-stack/contract-chat" },
    { key: "profile", icon: "person-circle", label: "Profile", route: "/freelancer-stack/freelancer-profile" },
  ];

  return (
    <View style={[styles.bottomNav, { backgroundColor: palette.navBg, borderTopColor: palette.border }]}> 
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
                <View style={[styles.createPill, { backgroundColor: palette.accent }]}>
                  <Ionicons name="add" size={22} color="#fff" />
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
  scrollContent: { paddingBottom: 110 },
  topBar: {
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 6,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  createPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
  },
});
