import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  return (
    <BlurView
      intensity={Platform.OS === "ios" ? 90 : 120}
      tint={isDark ? "dark" : "light"}
      style={styles.bottomBlur}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                isActive
                  ? styles.activeTab
                  : [
                      styles.inactiveTab,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(255,255,255,0.7)",
                        borderColor: isDark
                          ? "rgba(255,255,255,0.07)"
                          : "rgba(0,0,0,0.06)",
                      },
                    ],
              ]}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.88}
            >
              <Ionicons
                name={(isActive ? tab.iconFocused || tab.icon : tab.icon) as any}
                size={19}
                color={
                  isActive
                    ? "#FFFFFF"
                    : isDark
                    ? "rgba(255,255,255,0.68)"
                    : "rgba(0,0,0,0.58)"
                }
              />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.tabLabel,
                  {
                    color: isActive
                      ? "#FFFFFF"
                      : isDark
                      ? "rgba(255,255,255,0.68)"
                      : "rgba(0,0,0,0.58)",
                    fontFamily: isActive ? "Poppins_700Bold" : "Poppins_600SemiBold",
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
    borderRadius: 44,
    overflow: "hidden",
  },
  container: {
    width: "100%",
    minHeight: 58,
    borderRadius: 44,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  activeTab: {
    backgroundColor: "#FF3B30",
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 7,
  },
  inactiveTab: {
    borderWidth: 1,
  },
  tabLabel: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: "center",
    fontSize: 11,
    letterSpacing: 0,
  },
});
