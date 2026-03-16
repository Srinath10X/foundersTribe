import SearchTab from "@/components/home/SearchTab";
import FounderTopHeader from "@/components/navigation/FounderTopHeader";
import { useTheme } from "@/context/ThemeContext";
import { Stack } from "expo-router";
import React from "react";
import { StatusBar, StyleSheet, View } from "react-native";

export default function GlobalSearchScreen() {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />
      <SearchTab />

      <View style={styles.headerContainer} pointerEvents="box-none">
        <FounderTopHeader />
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
});
