import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.text.primary, // Dynamic Text Color
        tabBarInactiveTintColor: theme.text.muted, // Dynamic Muted Color
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface, // Dynamic Surface (White/Black)
          borderTopWidth: 0,
          elevation: 0, // Remove shadow on Android
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          position: 'absolute',
          // Add blur or translucency if supported, otherwise solid theme color
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: 'Poppins_600SemiBold',
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'For You',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "compass" : "compass-outline"} size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "bookmarks" : "bookmarks-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
