import { registerGlobals } from "@livekit/react-native";

registerGlobals();

import {
  DarkTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { LogBox, Platform } from "react-native";
import "react-native-reanimated";
import "react-native-get-random-values";
import { TextEncoder, TextDecoder } from "text-encoding";

// Polyfills
registerGlobals();

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder;
}

import { useColorScheme } from "@/hooks/use-color-scheme";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { RoleProvider, useRole } from "@/context/RoleContext";

import { BrandingView } from "@/components/BrandingView";
import WebLandingPage from "@/components/WebLandingPage";
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  useFonts as useBricolageFonts,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  useFonts as usePlayfairFonts,
} from "@expo-google-fonts/playfair-display";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts as usePoppinsFonts,
} from "@expo-google-fonts/poppins";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false, // not relevant for mobile but explicit
    },
    mutations: {
      retry: 0,
    },
  },
});

SplashScreen.preventAutoHideAsync();

import * as SystemUI from "expo-system-ui";

// Custom Deep Black Theme
const BlackTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#000000",
    card: "#000000",
    border: "#1a1a1a",
  },
};


function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading: authLoading, hasCompletedOnboarding } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { role, isRoleLoaded } = useRole();

  const [playfairLoaded] = usePlayfairFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold_Italic,
  });

  const [bricolageLoaded] = useBricolageFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });

  const [poppinsLoaded] = usePoppinsFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const fontsLoaded = playfairLoaded && bricolageLoaded && poppinsLoaded;

  useEffect(() => {
    // Set root view background to prevent white flash
    SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Navigation protection and proactive redirection logic
  useEffect(() => {
    // 0. Wait for initialization
    if (!fontsLoaded || authLoading || !isRoleLoaded) return;

    // 1. Analyze current state
    // Tab groups are now nested under (role-pager), so check both segment[0] patterns
    const inRolePager = segments[0] === "(role-pager)";
    const inFounderTabs =
      inRolePager && segments[1] === "(founder-tabs)";
    const inFreelancerTabs =
      inRolePager && segments[1] === "(freelancer-tabs)";
    const inOnboarding = segments[0] === "onboarding";

    if (session) {
      // 2. Handling Logged In Users
      if (!hasCompletedOnboarding) {
        // A. Onboarding Incomplete -> Force Onboarding
        if (segments[0] !== "onboarding") {
          setTimeout(() => router.replace("/onboarding"), 0);
        }
      } else {
        // B. Onboarding Complete -> Protect from Public Routes
        const segment = segments[0] || "";

        // whitelist allowed paths
        const isAllowedPath =
          segment === "(role-pager)" ||
          segment === "freelancer-stack" ||
          segment === "talent-stack" ||
          segment === "room" ||
          segment === "tribe" ||
          segment === "article" ||
          segment === "article_copy" ||
          segment === "edit-interests" ||
          segment === "edit-profile" ||
          segment === "search" ||
          pathname.includes("edit-interests") ||
          pathname.includes("edit-profile") ||
          pathname.includes("/search/");

        // Redirect to the correct tab tree based on role if on unauthorized page
        if (!isAllowedPath) {
          console.log("DEBUG: Redirecting to role tabs from:", pathname);
          const target =
            role === "freelancer"
              ? "/(role-pager)/(freelancer-tabs)/dashboard"
              : "/(role-pager)/(founder-tabs)/home";
          setTimeout(() => router.replace(target), 0);
        }
      }
    } else {
      // 3. Handling Logged Out Users
      if (inRolePager || inOnboarding) {
        setTimeout(() => router.replace("/"), 0);
      }
    }
  }, [session, segments, authLoading, fontsLoaded, hasCompletedOnboarding, isRoleLoaded, role]);

  // Create dynamic Navigation Theme
  const navTheme = {
    ...DarkTheme,
    dark: isDark,
    colors: {
      ...DarkTheme.colors,
      primary: theme.brand.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text.primary,
      border: theme.border,
      notification: theme.brand.secondary,
    },
  };

  // Don't show content until ready
  const isReady = fontsLoaded && !authLoading;

  // Show landing page on web, full app on mobile
  if (Platform.OS === "web") {
    return <WebLandingPage />;
  }

  return (
    <NavigationThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          animationDuration: 200,
        }}
      >
        {/* Auth / public screens */}
        <Stack.Screen name="index" />
        <Stack.Screen name="branding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="login-callback" />
        <Stack.Screen name="onboarding" />

        {/* Role pager: wraps both tab navigators in a horizontal PagerView */}
        <Stack.Screen name="(role-pager)" />

        {/* Detail stacks (pushed on top of tabs) */}
        <Stack.Screen name="freelancer-stack" />
        <Stack.Screen name="talent-stack" />

        {/* Other screens */}
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="edit-interests" />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal" }}
        />
      </Stack>
      {authLoading && <BrandingView />}
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <RoleProvider>
            <RootLayoutNav />
          </RoleProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
