import { Logo } from "@/components/Logo";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";

export const BrandingView = () => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(700)}
      exiting={FadeOut.duration(500)}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <Animated.View
          entering={ZoomIn.delay(120).duration(650)}
          style={[
            styles.logoHalo,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.03)",
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.07)",
            },
          ]}
        >
          <Logo width={210} height={48} />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(360).duration(650)}>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            Your AI-powered morning briefing, distilled.
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(600).duration(700)} style={styles.footerToggle}>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.toggleBtn, { backgroundColor: theme.surfaceElevated }]}
        >
          <Ionicons
            name={isDark ? "moon" : "sunny"}
            size={20}
            color={theme.text.primary}
          />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 18,
    marginTop: -24,
    paddingHorizontal: 24,
  },
  logoHalo: {
    width: 264,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 320,
  },
  footerToggle: {
    position: "absolute",
    bottom: 48,
    right: 28,
  },
  toggleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
});
