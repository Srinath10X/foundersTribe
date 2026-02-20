import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { useTheme } from "@/context/ThemeContext";

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: theme.brand.primary,
        tabBarInactiveTintColor: theme.text.muted,

        tabBarStyle: {
          position: "absolute",

          marginHorizontal: 18,

          left: 16,
          right: 16,

          bottom: Platform.OS === "ios" ? 20 : 14,

          height: 60, // 🔥 tighter
          paddingTop: 3,
          paddingBottom: Platform.OS === "ios" ? 10 : 6,

          backgroundColor: theme.surface,
          opacity: 0.9,
          borderTopWidth: 0,

          borderRadius: 999,

          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,

          elevation: 6,
        },

        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 2,
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          fontFamily: "Poppins_600SemiBold",
        },

        tabBarInactiveTintColor: theme.text.secondary ?? theme.text.muted,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Communities",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="global-search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tribes"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={20}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
