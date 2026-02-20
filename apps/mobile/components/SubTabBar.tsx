import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

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

  return (
    <BlurView
      intensity={Platform.OS === "ios" ? 90 : 125}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.bottomBlur,
        {
          backgroundColor: theme.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          opacity: 0.8,
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 8,
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: "transparent", // relying on BlurView backgroundColor
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          const tintColor = isActive
            ? theme.brand.primary
            : theme.text.secondary ?? theme.text.muted;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton]}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.88}
            >
              <Ionicons
                name={
                  (isActive ? tab.iconFocused || tab.icon : tab.icon) as any
                }
                size={18}
                color={tintColor}
              />
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
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bottomBlur: {
    borderRadius: 999,
    overflow: "hidden",
    opacity: 0.9,
    marginHorizontal: "8%", // 🔥 makes the horizontal width a bit smaller
  },
  container: {
    width: "100%",
    minHeight: 52, // 🔥 smaller height
    borderRadius: 999,
    paddingHorizontal: 12, // 🔥 smaller padding
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  tabButton: {
    flex: 1,
    minHeight: 40, // 🔥 smaller height
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0, // 🔥 tighter gap
    paddingVertical: 0,
  },
  tabLabel: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: "center",
    fontSize: 9, // 🔥 slightly smaller font
    fontWeight: "600",
    letterSpacing: 0,
  },
});
