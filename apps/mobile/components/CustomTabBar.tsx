import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import Svg, { Path, Polyline } from "react-native-svg";

import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";

// ─── Layout constants ──────────────────────────────────────────
export const BAR_HEIGHT = 64;
export const BAR_BOTTOM = Platform.OS === "ios" ? 32 : 20;

// ─── The mode switch pill (attached to edge) ────────────────────
function ModeSwitchPill({ isLeft }: { isLeft: boolean }) {
  const { role, animatedSwitchRole, isSwitching } = useRole();
  const { theme, isDark } = useTheme();

  // The pill always shows the OPPOSITE role
  const targetRole = role === "founder" ? "freelancer" : "founder";
  const targetLabel = targetRole === "founder" ? "To Founder" : "To Freelancer";

  const handleSwitch = () => {
    // Debounce is handled inside animatedSwitchRole
    if (isSwitching) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    animatedSwitchRole(targetRole);
  };

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const radiusStyle = isLeft
    ? {
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: 32,
      borderBottomRightRadius: 32,
    }
    : {
      borderTopLeftRadius: 32,
      borderBottomLeftRadius: 32,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    };

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={[
        switchStyles.container,
        radiusStyle,
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 10,
        },
      ]}
    >
      <View style={switchStyles.topDivider} />
      <BlurView
        intensity={Platform.OS === "ios" ? 95 : 120}
        tint={isDark ? "dark" : "light"}
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: isDark
              ? "rgba(18, 18, 18, 0.78)"
              : "rgba(255, 255, 255, 0.82)",
          },
        ]}
      />
      <Pressable
        onPress={handleSwitch}
        onPressIn={() => {
          scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
          opacity.value = withTiming(0.7, { duration: 150 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
          opacity.value = withTiming(1, { duration: 150 });
        }}
        style={switchStyles.pressable}
      >
        <Animated.View style={[switchStyles.inner, animatedStyle]}>
          <View style={switchStyles.iconWrap}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21,6H9A3,3,0,0,0,6,9H6a3,3,0,0,0,3,3h6a3,3,0,0,1,3,3h0a3,3,0,0,1-3,3H3"
                stroke={isDark ? "#D4D4D4" : "#525252"}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Polyline
                points="5 16 3 18 5 20"
                stroke={isDark ? "#D4D4D4" : "#525252"}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Polyline
                points="19 8 21 6 19 4"
                stroke={isDark ? "#D4D4D4" : "#525252"}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text
            style={[
              switchStyles.label,
              { color: isDark ? "#D4D4D4" : "#525252" },
            ]}
          >
            {targetLabel}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const switchStyles = StyleSheet.create({
  container: {
    height: BAR_HEIGHT,
    overflow: "hidden",
  },
  topDivider: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 100,
  },
  pressable: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
    lineHeight: 12,
    includeFontPadding: false,
  },
});

// ─── Tab Item Component ─────────────────────────────────────────
const TabItem = ({
  route,
  options,
  isFocused,
  onPress,
  onLongPress,
  tintColor,
}: {
  route: any;
  options: any;
  isFocused: boolean;
  onPress: (e: any) => void;
  onLongPress: () => void;
  tintColor: string;
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const label =
    typeof options.tabBarLabel === "string"
      ? options.tabBarLabel
      : typeof options.title === "string"
        ? options.title
        : route.name;

  return (
    <Pressable
      key={route.key}
      onPress={(e) => {
        if (Platform.OS !== "web" && !isFocused) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress(e);
      }}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
        opacity.value = withTiming(0.7, { duration: 150 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        opacity.value = withTiming(1, { duration: 150 });
      }}
      style={barStyles.tabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      android_ripple={{ color: "transparent" }}
    >
      <Animated.View style={[barStyles.tabItemContents, animatedStyle]}>
        <View style={barStyles.iconWrap}>
          {options.tabBarIcon?.({
            focused: isFocused,
            color: tintColor,
            size: 23,
          })}
        </View>
        <Text
          numberOfLines={1}
          style={[
            barStyles.tabLabel,
            {
              color: tintColor,
              fontFamily: isFocused
                ? "Poppins_600SemiBold"
                : "Poppins_500Medium",
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

// ─── Custom Tab Bar ────────────────────────────────────────────
export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme, isDark } = useTheme();
  const { role } = useRole();
  const isFounder = role === "founder";

  // Filter out hidden routes (expo-router sets href to null for hidden screens)
  const visibleRoutes = state.routes.filter((route) => {
    const opts = descriptors[route.key].options as any;
    if (opts.href === null) return false;
    if (opts.tabBarItemStyle?.display === "none") return false;
    return true;
  });

  const tabItems = visibleRoutes.map((route) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === state.routes.indexOf(route);

    // Active: Brand Red Accent. Inactive: Muted gray with good contrast.
    const tintColor = isFocused
      ? theme.brand.primary || "#E11D48" // Brand Red
      : isDark
        ? "#9CA3AF" // Gray-400 for dark mode
        : "#6B7280"; // Gray-500 for light mode

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: "tabLongPress",
        target: route.key,
      });
    };

    return (
      <TabItem
        key={route.key}
        route={route}
        options={options}
        isFocused={isFocused}
        onPress={onPress}
        onLongPress={onLongPress}
        tintColor={tintColor}
      />
    );
  });

  return (
    <View style={barStyles.globalContainer} pointerEvents="box-none">
      <View style={barStyles.row}>
        {/* Freelancer mode => Mode switch on the Left */}
        {!isFounder && <ModeSwitchPill isLeft={true} />}

        <Animated.View
          layout={LinearTransition.duration(200)}
          style={[
            barStyles.mainTabsWrapper,
            {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 10,
              flex: 1,
              marginLeft: !isFounder ? 12 : 16,
              marginRight: isFounder ? 12 : 16,
            },
          ]}
        >
          <View style={barStyles.topDivider} />

          <BlurView
            intensity={Platform.OS === "ios" ? 95 : 120}
            tint={isDark ? "dark" : "light"}
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: isDark
                  ? "rgba(18, 18, 18, 0.78)"
                  : "rgba(255, 255, 255, 0.82)",
              },
            ]}
          />

          <View style={barStyles.contentLayer}>
            <View style={barStyles.tabsSection}>{tabItems}</View>
          </View>
        </Animated.View>

        {/* Founder mode => Mode switch on the Right */}
        {isFounder && <ModeSwitchPill isLeft={false} />}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  globalContainer: {
    position: "absolute",
    bottom: BAR_BOTTOM,
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: BAR_HEIGHT,
  },
  mainTabsWrapper: {
    height: BAR_HEIGHT,
    borderRadius: 32,
    overflow: "hidden",
  },
  topDivider: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 100,
  },
  contentLayer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  tabsSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: "100%",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  tabItemContents: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 12,
    includeFontPadding: false,
  },
});
