import SearchTab from "@/components/home/SearchTab";
import { useTheme } from "@/context/ThemeContext";
import { useFounderConnections } from "@/hooks/useFounderConnections";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
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
  const router = useRouter();
  const { notificationCount } = useFounderConnections(true);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />
      <SearchTab />

      <View style={styles.headerContainer} pointerEvents="box-none">
        <LinearGradient
          colors={
            isDark
              ? ["rgba(0,0,0,0.7)", "rgba(0,0,0,0.4)", "transparent"]
              : ["rgba(255,255,255,0.8)", "rgba(255,255,255,0.4)", "transparent"]
          }
          style={styles.headerGradient}
          pointerEvents="box-none"
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
              onPress={() => router.push("/(role-pager)/(founder-tabs)/connections")}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
              {notificationCount > 0 ? (
                <View style={[styles.notificationBadge, { backgroundColor: theme.brand.primary }]}>
                  <View style={styles.notificationDot} />
                </View>
              ) : null}
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
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
});
