import { BsStarsIcon } from "@/components/icons/BsStarsIcon";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type SubTabItem<T extends string> = {
  key: T;
  label: string;
  icon: string;
  iconFocused?: string;
};

type SubTabBarProps<T extends string> = {
  tabs: SubTabItem<T>[];
  activeKey: T;
  onTabPress: (tab: T) => void;
  isDark: boolean;
};

export default function SubTabBar<T extends string>({
  tabs,
  activeKey,
  onTabPress,
  isDark,
}: SubTabBarProps<T>) {
  const { theme } = useTheme();

  const glassBackground = isDark
    ? "rgba(18, 18, 22, 0.65)"
    : "rgba(255, 255, 255, 0.55)";

  const borderColor = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(0,0,0,0.08)";

  return (
    <View
      style={[
        styles.glass,
        {
          borderColor,
          shadowColor: isDark ? "#000" : "#8E8E93",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.40 : 0.15,
          shadowRadius: 24,
          elevation: 12,
        },
      ]}
    >
      {/* Frosted glass */}
      <BlurView
        intensity={Platform.OS === "ios" ? 80 : 100}
        tint={isDark ? "dark" : "light"}
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: glassBackground },
        ]}
      />

      {/* Luminance gradient for depth */}
      <LinearGradient
        colors={
          isDark
            ? [
                "rgba(255,255,255,0.06)",
                "rgba(255,255,255,0.01)",
                "rgba(0,0,0,0.0)",
                "rgba(0,0,0,0.06)",
              ]
            : [
                "rgba(255,255,255,0.28)",
                "rgba(255,255,255,0.06)",
                "rgba(0,0,0,0.0)",
                "rgba(0,0,0,0.025)",
              ]
        }
        locations={[0, 0.3, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Tabs */}
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          const tintColor = isActive
            ? theme.brand.primary
            : theme.text.secondary ?? theme.text.muted;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.88}
            >
              {tab.icon === "bs-stars" ? (
                <BsStarsIcon size={18} color={tintColor} />
              ) : (
                <Ionicons
                  name={
                    (isActive ? tab.iconFocused || tab.icon : tab.icon) as any
                  }
                  size={18}
                  color={tintColor}
                />
              )}
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.tabLabel,
                  {
                    color: tintColor,
                    fontFamily: "Poppins_600SemiBold",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginHorizontal: "18%",
    marginBottom: 12,
  },
  container: {
    width: "100%",
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    paddingVertical: 0,
  },
  tabLabel: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0,
  },
});
