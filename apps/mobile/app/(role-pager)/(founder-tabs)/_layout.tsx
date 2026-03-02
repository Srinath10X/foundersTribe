import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import LiquidTabBar from "@/components/LiquidTabBar";
import { useTheme } from "@/context/ThemeContext";

export default function FounderTabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      initialRouteName="community"
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand.primary,
        tabBarInactiveTintColor: theme.text.secondary ?? theme.text.muted,
      }}
    >
      <Tabs.Screen
        name="community"
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
        name="home"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "newspaper" : "newspaper-outline"}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-search"
        options={{
          title: "AI",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "sparkles" : "sparkles-outline"}
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
        name="connections"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="thread/[threadId]"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
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
          href: null,
        }}
      />
    </Tabs>
  );
}
