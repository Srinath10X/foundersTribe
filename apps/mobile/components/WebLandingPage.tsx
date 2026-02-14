import { Logo } from '@/components/Logo';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function WebLandingPage() {
  const { width, height } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  
  // -- Responsive Breakpoints --
  const isSmall = width < 768; // Mobile
  const isMedium = width >= 768 && width < 1024; // Tablet

  const handleDownload = () => {
    // Update with real app store links
    alert('App coming soon to iOS and Android!');
  };

  // Dynamic font sizing for hero title
  const adaptiveTitleSize = Math.min(isSmall ? 48 : 72, width * (isSmall ? 0.14 : 0.08));

  return (
    <View style={[styles.container, { minHeight: height, backgroundColor: theme.background }]}>
      {/* Animated gradient background - Dynamic */}

      
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingVertical: Math.max(60, height * 0.08) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View 
          entering={FadeInUp.delay(200).duration(800)}
          style={[styles.hero, { gap: isSmall ? 16 : 24 }]}
        >
          {/* Premium Logo Container */}
          <View style={[styles.iconWrapper, isSmall && { width: 120, height: 120 }]}>
            <View style={[styles.logoContainer, { 
              backgroundColor: isDark ? '#1C1C1E' : '#000000',
              shadowColor: isDark ? '#000' : '#000',
              shadowOpacity: isDark ? 0.3 : 0.2,
            }]}>
              <Logo width={isSmall ? 60 : 80} height={isSmall ? 60 : 80} color="#D4AF37" />
            </View>
          </View>

          {/* Main Branding */}
          <Text style={[styles.mainTitle, { fontSize: adaptiveTitleSize, color: theme.text.primary }]}>foundersTribe</Text>
          <Text style={[styles.tagline, { fontSize: Math.min(isSmall ? 20 : 32, width * 0.06), color: theme.text.secondary }]}>
            Your AI-powered morning briefing, <Text style={{ color: theme.text.muted }}>distilled.</Text>
          </Text>

          {/* CTA Buttons */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity 
              style={[styles.primaryBtn, { 
                backgroundColor: isDark ? '#FFFFFF' : '#000000',
                shadowColor: isDark ? '#FFFFFF' : '#000000',
              }]}
              onPress={handleDownload}
            >
              <View style={[styles.gradientBtn, isSmall && { paddingVertical: 16, paddingHorizontal: 32 }]}>
                <Ionicons name="download-outline" size={isSmall ? 18 : 22} color={isDark ? '#000000' : '#FFFFFF'} />
                <Text style={[styles.primaryBtnText, isSmall && { fontSize: 16 }, { color: isDark ? '#000000' : '#FFFFFF' }]}>Get the App</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Features Section */}
        <Animated.View 
          entering={FadeInUp.delay(400).duration(800)}
          style={styles.featuresSection}
        >
          <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>WHY FOUNDERSTRIBE</Text>
          
          <View style={styles.featuresGrid}>
            <FeatureCard
              icon="sparkles-outline"
              title="AI-Curated"
              description="Machine learning algorithms select only what matters to you"
              delay={500}
              width={width}
              theme={theme}
              isDark={isDark}
            />
            <FeatureCard
              icon="newspaper-outline"
              title="Premium Content"
              description="Curated from the world's most trusted sources"
              delay={600}
              width={width}
              theme={theme}
              isDark={isDark}
            />
            <FeatureCard
              icon="time-outline"
              title="Time-Saving"
              description="Your complete briefing in under 5 minutes"
              delay={700}
              width={width}
              theme={theme}
              isDark={isDark}
            />
            <FeatureCard
              icon="flash-outline"
              title="Real-Time"
              description="Breaking news alerts for critical developments"
              delay={800}
              width={width}
              theme={theme}
              isDark={isDark}
            />
          </View>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View 
          entering={FadeInDown.delay(600).duration(800)}
          style={styles.statsSection}
        >
          <View style={[styles.statsGrid, isSmall && { gap: 32 }]}>
            <StatItem number="10K+" label="Active Readers" theme={theme} />
            <StatItem number="50+" label="News Sources" theme={theme} />
            <StatItem number="5min" label="Daily Digest" isSmall={isSmall} theme={theme} />
          </View>
        </Animated.View>

        {/* Ready Section */}
        <Animated.View 
          entering={FadeInUp.delay(700).duration(800)}
          style={[
            styles.readySection, 
            isSmall && { padding: 32, gap: 16 }, 
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', // Clean surface
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.05)',
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 24,
            }
          ]}
        >

          <Text style={[styles.readyTitle, isSmall && { fontSize: 28 }, { color: theme.text.primary }]}>Ready to transform your mornings?</Text>
          <Text style={[styles.readySub, isSmall && { fontSize: 15 }, { color: theme.text.secondary }]}>Join thousands of readers who start their day with intelligence.</Text>
          <TouchableOpacity 
            style={[styles.readyBtn, isSmall && { paddingVertical: 14, paddingHorizontal: 28 }, { backgroundColor: theme.brand.primary }]}
            onPress={handleDownload}
          >
            <Text style={[styles.readyBtnText, isSmall && { fontSize: 14 }]}>Start Your Briefing</Text>
            <Ionicons name="rocket-outline" size={isSmall ? 18 : 20} color="#000" />
          </TouchableOpacity>
        </Animated.View>

        {/* Simplified Robust Footer */}
        <Animated.View 
          entering={FadeInUp.delay(900).duration(800)}
          style={[styles.footer, isSmall && styles.footerSmall]}
        >
          <View style={styles.footerGrid}>
            {/* Brand Column */}
            <View style={[styles.footerColumn, isSmall && styles.footerColumnSmall, !isSmall && { flex: 2 }]}>
              <Text style={[styles.footerBrand, isSmall && styles.textCenter, { color: theme.text.primary }]}>foundersTribe</Text>
              <Text style={[styles.footerDescription, isSmall && styles.textCenter, { color: theme.text.secondary }]}>
                The essential morning briefing for the intelligent reader. Curated by AI, refined by excellence.
              </Text>
              <View style={[styles.socialIcons, isSmall && styles.justifyCenter]}>
                <Ionicons name="logo-twitter" size={isSmall ? 22 : 20} color={theme.text.secondary} />
                <Ionicons name="logo-linkedin" size={isSmall ? 22 : 20} color={theme.text.secondary} />
                <Ionicons name="logo-instagram" size={isSmall ? 22 : 20} color={theme.text.secondary} />
              </View>
            </View>

            {/* Link Columns */}
            <View style={[styles.footerLinkColumn, isSmall && styles.footerLinkColumnSmall]}>
              <Text style={[styles.footerTitle, isSmall && styles.textCenter, { color: theme.text.primary }]}>Experience</Text>
              <TouchableOpacity><Text style={[styles.footerLink, isSmall && styles.textCenter, { color: theme.text.secondary }]}>Features</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[styles.footerLink, isSmall && styles.textCenter, { color: theme.text.secondary }]}>Design</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[styles.footerLink, isSmall && styles.textCenter, { color: theme.text.secondary }]}>Briefing</Text></TouchableOpacity>
            </View>

            <View style={[styles.footerLinkColumn, isSmall && styles.footerLinkColumnSmall]}>
              <Text style={[styles.footerTitle, isSmall && styles.textCenter, { color: theme.text.primary }]}>Support</Text>
              <TouchableOpacity><Text style={[styles.footerLink, isSmall && styles.textCenter, { color: theme.text.secondary }]}>Privacy Policy</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[styles.footerLink, isSmall && styles.textCenter, { color: theme.text.secondary }]}>Terms of Service</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[styles.footerLink, isSmall && styles.textCenter, { color: theme.text.secondary }]}>Contact Us</Text></TouchableOpacity>
            </View>

            <View style={[styles.footerLinkColumn, isSmall && styles.footerLinkColumnSmall]}>
              <Text style={[styles.footerTitle, isSmall && styles.textCenter, { color: theme.text.primary }]}>Connect</Text>
              <TouchableOpacity onPress={handleDownload}><Text style={[styles.footerLink, isSmall && styles.textCenter, { color: theme.text.secondary }]}>iOS App</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleDownload}><Text style={[styles.footerLink, isSmall && styles.textCenter, { color: theme.text.secondary }]}>Android App</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[styles.footerLink, isSmall && styles.textCenter, { color: theme.text.secondary }]}>Newsletter</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerBottom}>
            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(212, 165, 116, 0.1)' : 'rgba(0,0,0,0.1)' }]} />
            <View style={[styles.footerBottomContent, isSmall && styles.footerBottomContentSmall]}>
              <Text style={[styles.footerTagline, { color: theme.text.tertiary }]}>
                RESERVED FOR THE DISCERNING READER
              </Text>
              <Text style={[styles.copyright, isSmall && styles.textCenter, { color: theme.text.secondary }]}>
                © 2026 <Text style={{ fontFamily: 'BricolageGrotesque_700Bold' }}>foundersTribe</Text> • San Francisco
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function FeatureCard({ icon, title, description, delay, width, theme, isDark }: any) {
  const isSmall = width < 768;
  const isMedium = width >= 768 && width < 1200;
  
  // -- Responsive Grid Logic --
  // Calculate card width based on screen width
  let cardWidth;
  if (isSmall) {
    cardWidth = width - 64; // Single column (Full width - padding)
  } else if (isMedium) {
    cardWidth = (width - 64 - 24) / 2; // Two columns
  } else {
    cardWidth = Math.min(260, (width - 120) / 4); // Four columns max
  }

  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(600)}
      style={[
        styles.featureCard, 
        { 
          width: cardWidth, 
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF', 
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.05)',
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0 : 0.05,
          shadowRadius: 12,
        }
      ]}
    >
      <View style={styles.featureIconContainer}>
          <Ionicons name={icon} size={28} color="#D4AF37" />
      </View>
      <Text style={[styles.featureTitle, { color: theme.text.primary }]}>{title}</Text>
      <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>{description}</Text>
    </Animated.View>
  );
}

function StatItem({ number, label, isSmall, theme }: { number: string; label: string; isSmall?: boolean, theme: any }) {
  return (
    <View style={[styles.statItem, isSmall && { minWidth: 100 }]}>
      <Text style={[styles.statNumber, isSmall && { fontSize: 36 }, { color: theme.text.primary }]}>{number}</Text>
      <Text style={[styles.statLabel, isSmall && { fontSize: 12 }, { color: theme.text.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  textCenter: {
    textAlign: 'center',
  },
  justifyCenter: {
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 120,
    overflow: 'visible',
  },
  
  // Hero Section
  hero: {
    alignItems: 'center',
    maxWidth: 800,
  },
  iconWrapper: {
    position: 'relative',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
  mainTitle: {
    fontFamily: 'BricolageGrotesque_700Bold',
    letterSpacing: -2,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: 16,
  },
  ctaContainer: {
    marginTop: 32,
    gap: 16,
  },
  primaryBtn: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 48,
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'BricolageGrotesque_700Bold',
    letterSpacing: 0.5,
  },

  // Features Section
  featuresSection: {
    width: '100%',
    maxWidth: 1200,
    gap: 48,
  },
  sectionLabel: {
    fontSize: 12, // Slightly smaller
    fontWeight: '600',
    letterSpacing: 2.5, // Wider spacing
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold', // Standardized font
    textTransform: 'uppercase',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  featureCard: {
    padding: 32,
    borderRadius: 24, // Matches Article Card curve
    borderWidth: 1,
    gap: 16,
    // Background and border handled dynamically in component
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    marginBottom: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)', // Subtle Gold tint
  },
  featureIconGradient: {
    // Removed complex gradient wrapper
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold', // Standardized
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 15,
    lineHeight: 24, // Better readability
    fontFamily: 'Poppins_400Regular', // Standardized
  },

  // Stats Section
  statsSection: {
    width: '100%',
    maxWidth: 900,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 48,
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'BricolageGrotesque_700Bold',
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  
  // Ready Section
  readySection: {
    width: '100%',
    maxWidth: 900,
    padding: 60,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    gap: 24,
    overflow: 'hidden',
    // Background handled inline
  },
  readyGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  readyTitle: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: 48,
    textAlign: 'center',
    letterSpacing: -1.5,
  },
  readySub: {
    fontSize: 18,
    textAlign: 'center',
    maxWidth: 500,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 28,
  },
  readyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 50,
  },
  readyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },

  // Footer
  footer: {
    width: '100%',
    maxWidth: 1200,
    gap: 60,
    paddingBottom: 60,
  },
  footerSmall: {
    paddingHorizontal: 16,
    gap: 40,
  },
  footerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
    justifyContent: 'space-between',
  },
  footerColumn: {
    minWidth: 280,
    gap: 20,
    flex: 1,
  },
  footerColumnSmall: {
    minWidth: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerLinkColumn: {
    minWidth: 160,
    gap: 16,
    flex: 1,
  },
  footerLinkColumnSmall: {
    minWidth: '100%',
    alignItems: 'center',
  },
  footerBrand: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: 28,
  },
  footerDescription: {
    fontSize: 15,
    lineHeight: 24,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 20,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  footerLink: {
    fontSize: 14,
  },
  footerBottom: {
    width: '100%',
    gap: 32,
    marginTop: 20,
  },
  divider: {
    width: '100%',
    height: 1,
  },
  footerBottomContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  footerBottomContentSmall: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  footerTagline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
  },
  copyright: {
    fontSize: 13,
  },
});
