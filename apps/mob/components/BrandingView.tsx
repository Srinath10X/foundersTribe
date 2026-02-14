import { Logo } from '@/components/Logo';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export const BrandingView = () => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <Animated.View 
      entering={FadeIn.duration(800)}
      exiting={FadeOut.duration(800)} // Slower fade out
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        {/* Minimalist Logo - Zooms in first */}
        <Animated.View 
          entering={ZoomIn.delay(200).duration(800)} 
          style={[styles.logoContainer, { 
            backgroundColor: isDark ? '#1C1C1E' : '#000000',
            shadowColor: isDark ? '#000' : '#000',
            shadowOpacity: isDark ? 0.3 : 0.2,
          }]}
        >
            <Logo width={100} height={100} color="#D4AF37" />
        </Animated.View>

        {/* Minimalist Text - Fades in after logo */}
        <Animated.View 
          entering={FadeIn.delay(500).duration(800)} 
          style={styles.textContainer}
        >
          <Text style={[styles.logoText, { color: theme.text.primary }]}>foundersTribe</Text>
        </Animated.View>
      </View>

      {/* Theme Toggle (Bottom Right) */}
      <Animated.View 
        entering={FadeIn.delay(800).duration(1000)} 
        style={styles.footerToggle}
      >
        <TouchableOpacity 
          onPress={toggleTheme}
          style={[styles.toggleBtn, { backgroundColor: theme.surfaceElevated }]}
        >
          <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={theme.text.primary} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24, // Space between logo and text
    marginTop: -40, // Match Landing Page visual balance
  },
  logoContainer: {
    width: 140, // Larger
    height: 140,
    borderRadius: 40, // Softer radius
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 }, // Deeper shadow
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 42, // Matched with Landing Page
    fontFamily: 'BricolageGrotesque_700Bold',
    letterSpacing: -1.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  footerToggle: {
    position: 'absolute',
    bottom: 48,
    right: 32,
  },
  toggleBtn: {
    width: 56, // Larger touch target
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
});
