import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { useFounderConnections } from "@/hooks/useFounderConnections";

type FounderTopHeaderProps = {
  containerStyle?: StyleProp<ViewStyle>;
  withBorder?: boolean;
};

export default function FounderTopHeader({
  containerStyle,
  withBorder = false,
}: FounderTopHeaderProps) {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { notificationCount } = useFounderConnections(true);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          borderBottomWidth: withBorder ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: theme.border,
        },
        containerStyle,
      ]}
    >
      <View style={styles.row}>
        <Image
          source={
            isDark
              ? require("@/assets/images/logo-dark.png")
              : require("@/assets/images/logo-light.png")
          }
          style={styles.brandLogo}
          contentFit="contain"
        />

        <View style={styles.icons}>
          <TouchableOpacity
            style={[
              styles.iconBtn,
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
              <View
                style={[
                  styles.notificationBadge,
                  { backgroundColor: theme.brand.primary },
                ]}
              >
                <View style={styles.notificationDot} />
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 36,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandLogo: {
    height: 24,
    width: 140,
  },
  icons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
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
