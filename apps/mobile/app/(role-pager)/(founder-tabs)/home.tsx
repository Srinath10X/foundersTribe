import FeedTab from "@/components/home/FeedTab";
import ForYouTab from "@/components/home/ForYouTab";
import { useFounderConnections } from "@/hooks/useFounderConnections";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const TOP_CONTENT_OFFSET = Platform.OS === "ios" ? 156 : 132;

type SubTab = "feed" | "foryou";

const SUB_TABS: {
  key: SubTab;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconFocused: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
    {
      key: "feed",
      label: "News",
      icon: "newspaper-outline",
      iconFocused: "newspaper",
    },
    {
      key: "foryou",
      label: "For You",
      icon: "sparkles-outline",
      iconFocused: "sparkles",
    },
  ];

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { notificationCount } = useFounderConnections(true);
  const [activeTab, setActiveTab] = useState<SubTab>("feed");
  const handleTabPress = useCallback((tab: SubTab) => {
    setActiveTab(tab);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "feed":
        return <FeedTab topContentOffset={TOP_CONTENT_OFFSET} />;
      case "foryou":
        return <ForYouTab topContentOffset={TOP_CONTENT_OFFSET} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {renderContent()}

      {/* Header Overlay — gradient fade top→bottom */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={["#000000", "#000000", "#000000"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerInner}>
            <Image
              source={
                isDark
                  ? require("@/assets/images/logo-dark.png")
                  : require("@/assets/images/logo-dark.png")
              }
              style={[
                styles.brandLogo,
                !isDark && { tintColor: theme.text.primary },
              ]}
              contentFit="contain"
            />
            <View style={styles.headerIcons}>
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
                  color={isDark ? "#FFFFFF" : theme.text.primary}
                />
                {notificationCount > 0 ? (
                  <View style={[styles.notificationBadge, { backgroundColor: theme.brand.primary }]}>
                    <View style={styles.notificationDot} />
                  </View>
                ) : null}
              </TouchableOpacity>
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
                onPress={() => router.push("/(role-pager)/(founder-tabs)/profile")}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={isDark ? "#FFFFFF" : theme.text.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.topTabsRow,
              { borderBottomColor: theme.border, backgroundColor: "#000000" },
            ]}
          >
            {SUB_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.topTabBtn}
                  onPress={() => handleTabPress(tab.key)}
                  activeOpacity={0.84}
                >
                  <Ionicons
                    name={isActive ? tab.iconFocused : tab.icon}
                    size={16}
                    color={isActive ? theme.text.primary : theme.text.secondary}
                  />
                  <Text
                    style={[
                      styles.topTabText,
                      {
                        color: isActive ? theme.text.primary : theme.text.secondary,
                        fontFamily: isActive ? "Poppins_700Bold" : "Poppins_600SemiBold",
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {isActive && (
                    <View
                      style={[
                        styles.topTabIndicator,
                        { backgroundColor: theme.brand.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
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

  // Header
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerGradient: {
    paddingBottom: 0,
    backgroundColor: "#000000",
  },
  headerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 36,
    paddingBottom: 8,
  },
  brandLogo: {
    height: 24,
    width: 140,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

  topTabsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 10,
    paddingBottom: 12,
    position: "relative",
  },
  topTabText: {
    fontSize: 30 / 2,
    lineHeight: 20,
  },
  topTabIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
});
