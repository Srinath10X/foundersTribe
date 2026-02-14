import { Logo } from '@/components/Logo';
import WebLandingPage from '@/components/WebLandingPage';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function BrandingPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  // Web Specific View
  if (Platform.OS === 'web') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <WebLandingPage />
      </>
    );
  }
  
  // -- Navigation Handlers --
  const handlePress = () => {
    // Smart redirect based on auth state
    router.push(session ? '/home' : '/login');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.safeArea}>
        
        {/* Header - Fades in first */}
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.header}>
          <Text style={[styles.headerLogo, { color: theme.text.primary }]}>foundersTribe</Text>
          <TouchableOpacity 
            onPress={handleSignIn}
            activeOpacity={0.7}
          >
            <Text style={[styles.signInText, { color: theme.text.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Center Content */}
        <View style={styles.content}>
          
          {/* Logo */}
          <Animated.View entering={ZoomIn.delay(200).duration(800)} style={styles.logoWrapper}>
            <View style={[styles.logoContainer, { 
              backgroundColor: isDark ? '#1C1C1E' : '#000000',
              shadowColor: isDark ? '#000' : '#000',
              shadowOpacity: isDark ? 0.3 : 0.2,
            }]}>
               <Logo width={100} height={100} color="#D4AF37" />
            </View> 
          </Animated.View>

          {/* Title & Tagline */}
          <Animated.View entering={FadeInUp.delay(500).duration(800)} style={styles.textContainer}>
            <Text style={[styles.mainTitle, { color: theme.text.primary }]}>foundersTribe</Text>
            <Text style={[styles.tagline, { color: theme.text.secondary }]}>
              Your AI-powered morning{'\n'}briefing, <Text style={{ color: theme.text.muted }}>distilled.</Text>
            </Text>
          </Animated.View>

          {/* Get Started Button */}
          <Animated.View entering={FadeInUp.delay(700).duration(800)} style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.primaryBtn, { 
                backgroundColor: isDark ? '#FFFFFF' : '#000000',
              }]}
              onPress={handlePress}
              activeOpacity={0.9}
            >
              <Text style={[styles.primaryBtnText, { 
                color: isDark ? '#000000' : '#FFFFFF' 
              }]}>Get Started</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer */}
        <Animated.View entering={FadeInUp.delay(900).duration(800)} style={styles.footer}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border, opacity: 0.5 }]} />
          
          <View style={styles.footerContent}>
            <Text style={[styles.footerText, { color: theme.text.tertiary }]}>RESERVED FOR THE DISCERNING READER</Text>
            
            <TouchableOpacity 
              onPress={toggleTheme}
              style={[styles.themeToggle, { backgroundColor: theme.surfaceElevated }]}
            >
              <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={theme.text.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerLogo: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque_600SemiBold',
    letterSpacing: -0.5,
  },
  signInText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque_600SemiBold',
    letterSpacing: 0,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    marginTop: -40, // Visual balance
  },
  logoWrapper: {
    marginBottom: 40,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000', // Always black for logo contrast
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  mainTitle: {
    fontSize: 42, // Matched with BrandingView
    fontFamily: 'BricolageGrotesque_700Bold',
    letterSpacing: -1.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular', // Clean clarity
    opacity: 0.8,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryBtn: {
    height: 64, // Taller touch target
    width: '100%',
    borderRadius: 32, // Perfect pill
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, // Stronger shadow
    shadowRadius: 16,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'BricolageGrotesque_700Bold',
    letterSpacing: 0.5,
  },
  footer: {
    width: '100%',
    paddingBottom: 20, // Bottom padding
  },
  dividerLine: {
    width: 60, // Short divider
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 32,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  footerText: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque_700Bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Space for toggle
    paddingLeft: 40, // Center text properly ignoring toggle
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
  },
});
