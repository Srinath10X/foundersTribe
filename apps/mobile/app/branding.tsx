import { Logo } from "@/components/Logo";
import WebLandingPage from "@/components/WebLandingPage";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

export default function BrandingPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  if (Platform.OS === "web") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <WebLandingPage />
      </>
    );
  }

  const handlePress = () => {
    router.push(session ? "/home" : "/login");
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.safeArea}>
        <Animated.View
          entering={FadeInUp.delay(200).duration(600)}
          style={styles.header}
        >
          <Image
            source={
              isDark
                ? require("@/assets/images/logo-dark.png")
                : require("@/assets/images/logo-light.png")
            }
            style={styles.headerLogo}
            contentFit="contain"
          />
          <TouchableOpacity onPress={handleSignIn} activeOpacity={0.75}>
            <Text style={[styles.signInText, { color: theme.text.primary }]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.content}>
          <Animated.View
            entering={ZoomIn.delay(180).duration(700)}
            style={styles.logoWrapper}
          >
            <View
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
              <Logo width={220} height={50} />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(420).duration(700)}
            style={styles.textContainer}
          >
            <Text style={[styles.tagline, { color: theme.text.secondary }]}>
              Your AI-powered morning{"\n"}briefing,{" "}
              <Text style={{ color: theme.text.muted }}>distilled.</Text>
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(620).duration(700)}
            style={styles.actionContainer}
          >
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: isDark ? "#FFFFFF" : "#000000" },
              ]}
              onPress={handlePress}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: isDark ? "#000000" : "#FFFFFF" },
                ]}
              >
                Get Started
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInUp.delay(820).duration(700)}
          style={styles.footer}
        >
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: theme.border, opacity: 0.5 },
            ]}
          />
          <View style={styles.footerContent}>
            <Text style={[styles.footerText, { color: theme.text.tertiary }]}>
              RESERVED FOR THE DISCERNING READER
            </Text>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.themeToggle,
                { backgroundColor: theme.surfaceElevated },
              ]}
            >
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={20}
                color={theme.text.primary}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  headerLogo: {
    width: 136,
    height: 28,
  },
  signInText: {
    fontSize: 16,
    fontFamily: "BricolageGrotesque_600SemiBold",
    letterSpacing: 0,
  },
  content: {
    alignItems: "center",
    width: "100%",
    flex: 1,
    justifyContent: "center",
    marginTop: -16,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  logoHalo: {
    width: 272,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 36,
  },
  tagline: {
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    opacity: 0.85,
  },
  actionContainer: {
    width: "100%",
    alignItems: "center",
  },
  primaryBtn: {
    height: 62,
    width: "100%",
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "BricolageGrotesque_700Bold",
    letterSpacing: 0.4,
  },
  footer: {
    width: "100%",
    paddingBottom: 20,
  },
  dividerLine: {
    width: 56,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 28,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  footerText: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: "BricolageGrotesque_700Bold",
    flex: 1,
    textAlign: "center",
    marginRight: 40,
    paddingLeft: 40,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 0,
  },
});
