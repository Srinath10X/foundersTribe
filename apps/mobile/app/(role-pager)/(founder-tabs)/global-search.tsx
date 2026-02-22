import DiscoverTab from "@/components/home/DiscoverTab";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import React from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function GlobalSearchScreen() {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />
      <DiscoverTab />

      <View style={styles.headerContainer}>
        <LinearGradient
          colors={
            isDark
              ? ["rgba(0,0,0,0.7)", "rgba(0,0,0,0.4)", "transparent"]
              : ["rgba(255,255,255,0.8)", "rgba(255,255,255,0.4)", "transparent"]
          }
          style={styles.headerGradient}
        >
          <View style={styles.headerInner}>
            <Image
              source={
                isDark
                  ? require("@/assets/images/logo-dark.png")
                  : require("@/assets/images/logo-light.png")
              }
              style={styles.brandLogo}
              contentFit="contain"
            />
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerGradient: {
    paddingBottom: 40,
  },
  headerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 36,
    paddingBottom: 4,
  },
  brandLogo: {
    height: 24,
    width: 140,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
