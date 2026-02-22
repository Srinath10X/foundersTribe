import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useEffect, useMemo } from "react";
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Polyline } from "react-native-svg";

import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";

// ─── Layout constants ──────────────────────────────────────────
export const BAR_HEIGHT = 66;
export const BAR_BOTTOM = Platform.OS === "ios" ? 28 : 20;
const BAR_RADIUS = 40;
const BAR_VERTICAL_PADDING = 7;
const BUBBLE_HEIGHT = BAR_HEIGHT - BAR_VERTICAL_PADDING * 2;
const BUBBLE_BORDER_RADIUS = BUBBLE_HEIGHT / 2;
const BUBBLE_INSET = 4;
const ICON_SIZE = 22;
const ICON_LABEL_GAP = 3;
const SPRING_CONFIG = { damping: 18, stiffness: 200, mass: 0.8 };
const PRESS_SPRING = { damping: 15, stiffness: 300 };

// ─── Glass Surface ──────────────────────────────────────────────
// Subtle vertical luminance overlay that goes ON TOP of BlurView
// inside the same overflow-hidden container.
const GlassSurface = memo(function GlassSurface({
  isDark,
}: {
  isDark: boolean;
}) {
  return (
    <LinearGradient
      colors={
        isDark
          ? [
              "rgba(255,255,255,0.06)",
              "rgba(255,255,255,0.01)",
              "rgba(0,0,0,0.0)",
              "rgba(0,0,0,0.06)",
            ]
          : [
              "rgba(255,255,255,0.28)",
              "rgba(255,255,255,0.06)",
              "rgba(0,0,0,0.0)",
              "rgba(0,0,0,0.025)",
            ]
      }
      locations={[0, 0.3, 0.6, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    />
  );
});

// ─── The mode switch pill (attached to edge) ────────────────────
const ModeSwitchPill = memo(function ModeSwitchPill({
  isLeft,
}: {
  isLeft: boolean;
}) {
  const { role, animatedSwitchRole, isSwitching } = useRole();
  const { isDark } = useTheme();

  const targetRole = role === "founder" ? "freelancer" : "founder";
  const targetLabel =
    targetRole === "founder" ? "Founder\nMode" : "Freelancer\nMode";

  const handleSwitch = useCallback(() => {
    if (isSwitching) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    animatedSwitchRole(targetRole);
  }, [isSwitching, animatedSwitchRole, targetRole]);

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

  const glassBackground = isDark
    ? "rgba(18, 18, 22, 0.65)"
    : "rgba(255, 255, 255, 0.55)";

  const borderColor = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(0,0,0,0.08)";

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={[
        switchStyles.container,
        radiusStyle,
        {
          borderColor,
          borderWidth: StyleSheet.hairlineWidth,
          ...(isLeft ? { borderLeftWidth: 0 } : { borderRightWidth: 0 }),
          shadowColor: isDark ? "#000" : "#8E8E93",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: 20,
          elevation: 10,
        },
      ]}
    >
      <BlurView
        intensity={Platform.OS === "ios" ? 80 : 100}
        tint={isDark ? "dark" : "light"}
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: glassBackground },
        ]}
      />
      <Pressable
        onPress={handleSwitch}
        onPressIn={() => {
          scale.value = withSpring(0.9, PRESS_SPRING);
          opacity.value = withTiming(0.7, { duration: 150 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, PRESS_SPRING);
          opacity.value = withTiming(1, { duration: 150 });
        }}
        style={switchStyles.pressable}
      >
        <Animated.View style={[switchStyles.inner, animatedStyle]}>
          <View style={switchStyles.iconWrap}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
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
});

const switchStyles = StyleSheet.create({
  container: {
    height: BAR_HEIGHT,
    overflow: "hidden",
  },
  pressable: {
    flex: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  label: {
    fontSize: 8.5,
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
    lineHeight: 11,
    includeFontPadding: false,
  },
});

// ─── Tab Item Component ─────────────────────────────────────────
interface TabItemProps {
  route: any;
  options: any;
  isFocused: boolean;
  onPress: (e: any) => void;
  onLongPress: () => void;
  activeColor: string;
  inactiveColor: string;
}

const TabItem = memo(function TabItem({
  route,
  options,
  isFocused,
  onPress,
  onLongPress,
  activeColor,
  inactiveColor,
}: TabItemProps) {
  const pressScale = useSharedValue(1);
  const iconScale = useSharedValue(isFocused ? 1.07 : 1);
  const textOpacity = useSharedValue(isFocused ? 1 : 0.55);

  useEffect(() => {
    iconScale.value = withSpring(isFocused ? 1.07 : 1, SPRING_CONFIG);
    textOpacity.value = withTiming(isFocused ? 1 : 0.55, { duration: 200 });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value },
      { scale: iconScale.value },
    ],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const label =
    typeof options.tabBarLabel === "string"
      ? options.tabBarLabel
      : typeof options.title === "string"
        ? options.title
        : route.name;

  const tintColor = isFocused ? activeColor : inactiveColor;

  return (
    <Pressable
      onPress={(e) => {
        if (Platform.OS !== "web" && !isFocused) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress(e);
      }}
      onLongPress={onLongPress}
      onPressIn={() => {
        pressScale.value = withSpring(0.92, PRESS_SPRING);
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, PRESS_SPRING);
      }}
      style={tabItemStyles.container}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      android_ripple={{ color: "transparent" }}
    >
      <Animated.View style={[tabItemStyles.inner, animatedIconStyle]}>
        <View style={tabItemStyles.iconWrap}>
          {options.tabBarIcon?.({
            focused: isFocused,
            color: tintColor,
            size: ICON_SIZE,
          })}
        </View>
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          tabItemStyles.label,
          animatedTextStyle,
          {
            color: tintColor,
            fontFamily: isFocused
              ? "Poppins_600SemiBold"
              : "Poppins_500Medium",
          },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
});

const tabItemStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    overflow: "hidden",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: ICON_SIZE + 4,
    height: ICON_SIZE + 4,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ICON_LABEL_GAP,
  },
  label: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
    includeFontPadding: false,
    maxWidth: "90%",
  },
});

// ─── Sliding Bubble Component ───────────────────────────────────
interface SlidingBubbleProps {
  activeIndex: number;
  containerWidth: number;
  tabCount: number;
  isDark: boolean;
  accentColor: string;
}

const SlidingBubble = memo(function SlidingBubble({
  activeIndex,
  containerWidth,
  tabCount,
  isDark,
  accentColor,
}: SlidingBubbleProps) {
  const tabWidth = tabCount > 0 ? containerWidth / tabCount : 0;
  const translateX = useSharedValue(activeIndex * tabWidth);

  useEffect(() => {
    translateX.value = withSpring(activeIndex * tabWidth, SPRING_CONFIG);
  }, [activeIndex, tabWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const bubbleBg = isDark
    ? "rgba(255, 255, 255, 0.07)"
    : "rgba(0, 0, 0, 0.04)";

  const borderColor = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(0,0,0,0.05)";

  const glowColor = isDark
    ? `${accentColor}15`
    : `${accentColor}0A`;

  if (tabWidth === 0) return null;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: (BAR_HEIGHT - BUBBLE_HEIGHT) / 2,
          width: tabWidth,
          height: BUBBLE_HEIGHT,
          paddingHorizontal: BUBBLE_INSET,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          bubbleStyles.bubble,
          {
            backgroundColor: bubbleBg,
            borderColor,
          },
        ]}
      >
        {/* Accent glow tint */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: glowColor,
              borderRadius: BUBBLE_BORDER_RADIUS,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
});

const bubbleStyles = StyleSheet.create({
  bubble: {
    flex: 1,
    borderRadius: BUBBLE_BORDER_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});

// ─── Liquid Glass Tab Bar ───────────────────────────────────────
export default function LiquidTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme, isDark } = useTheme();
  const { role } = useRole();
  const isFounder = role === "founder";

  const [measuredWidth, setMeasuredWidth] = React.useState(0);

  const onTabsLayout = useCallback((e: LayoutChangeEvent) => {
    setMeasuredWidth(e.nativeEvent.layout.width);
  }, []);

  const visibleRoutes = useMemo(
    () =>
      state.routes.filter((route) => {
        const opts = descriptors[route.key].options as any;
        if (opts.href === null) return false;
        if (opts.tabBarItemStyle?.display === "none") return false;
        return true;
      }),
    [state.routes, descriptors]
  );

  const activeVisibleIndex = useMemo(() => {
    const activeRoute = state.routes[state.index];
    return visibleRoutes.findIndex((r) => r.key === activeRoute.key);
  }, [state.index, state.routes, visibleRoutes]);

  const accentColor = theme.brand.primary || "#FF3B30";
  const inactiveColor = isDark ? "#9CA3AF" : "#6B7280";

  const glassBackground = isDark
    ? "rgba(18, 18, 22, 0.65)"
    : "rgba(255, 255, 255, 0.55)";

  const borderColor = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(0,0,0,0.08)";

  const tabItems = visibleRoutes.map((route, index) => {
    const { options } = descriptors[route.key];
    const isFocused = activeVisibleIndex === index;

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
        activeColor={accentColor}
        inactiveColor={inactiveColor}
      />
    );
  });

  return (
    <View style={barStyles.globalContainer} pointerEvents="box-none">
      <View style={barStyles.row}>
        {!isFounder && <ModeSwitchPill isLeft={true} />}

        <Animated.View
          layout={LinearTransition.duration(200)}
          style={[
            barStyles.glass,
            {
              borderColor,
              shadowColor: isDark ? "#000" : "#8E8E93",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.40 : 0.15,
              shadowRadius: 24,
              elevation: 12,
              flex: 1,
              marginLeft: !isFounder ? 12 : 16,
              marginRight: isFounder ? 12 : 16,
            },
          ]}
        >
          {/* Frosted glass */}
          <BlurView
            intensity={Platform.OS === "ios" ? 80 : 100}
            tint={isDark ? "dark" : "light"}
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: glassBackground },
            ]}
          />

          {/* Luminance gradient for depth */}
          <GlassSurface isDark={isDark} />

          {/* Content */}
          <View style={barStyles.contentLayer}>
            <View style={barStyles.tabsSection} onLayout={onTabsLayout}>
              {tabItems}
            </View>

            {activeVisibleIndex >= 0 && measuredWidth > 0 && (
              <SlidingBubble
                activeIndex={activeVisibleIndex}
                containerWidth={measuredWidth}
                tabCount={visibleRoutes.length}
                isDark={isDark}
                accentColor={accentColor}
              />
            )}
          </View>
        </Animated.View>

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
  glass: {
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  contentLayer: {
    flex: 1,
  },
  tabsSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    zIndex: 10,
  },
});
