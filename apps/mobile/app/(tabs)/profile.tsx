import { Typography } from '@/constants/DesignSystem';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    articlesRead: 0,
    bookmarks: 0,
    likes: 0,
  });

  // -- Data Loading --
  useEffect(() => {
    loadUserData();
    loadStats();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || '');
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
      setUserName(fullName || user.email?.split('@')[0] || 'User');
    }
  };

  // Calculate stats from User Interactions table
  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookmarks } = await supabase
        .from('user_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('bookmarked', true);

      const { data: likes } = await supabase
        .from('user_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('liked', true);

      setStats({
        articlesRead: (bookmarks?.length || 0) + (likes?.length || 0),
        bookmarks: bookmarks?.length || 0,
        likes: likes?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLogout = async () => {
    triggerHaptic();
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/');
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  const handleEditInterests = async () => {
    await triggerHaptic();
    router.push('/edit-interests');
  };

  const MenuItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showChevron = true,
    rightElement,
    accentColor
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showChevron?: boolean;
    rightElement?: React.ReactNode;
    accentColor?: string;
  }) => {
    const iconColor = accentColor || theme.brand.primary;
    
    return (
      <TouchableOpacity 
        style={[styles.menuItem, { borderBottomColor: theme.border }]} 
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <View style={styles.menuItemLeft}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>{title}</Text>
            {subtitle && <Text style={[styles.menuItemSubtitle, { color: theme.text.tertiary }]}>{subtitle}</Text>}
          </View>
        </View>
        {rightElement || (showChevron && (
          <Ionicons name="chevron-forward" size={16} color={theme.text.muted} />
        ))}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.header}>
            <View style={styles.avatarWrapper}>
                <View style={[styles.avatar, { borderColor: theme.brand.primary, shadowColor: theme.brand.primary }]}>
                    <Text style={[styles.avatarInitial, { color: theme.brand.primary }]}>
                        {userName.charAt(0).toUpperCase() || 'P'}
                    </Text>
                </View>
            </View>
            <Text style={[styles.userName, { color: theme.text.primary }]}>{userName}</Text>
            <Text style={[styles.userEmail, { color: theme.text.secondary }]}>{userEmail}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.statNumber, { color: theme.brand.primary }]}>{stats.articlesRead}</Text>
            <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>ARTICLES</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.statNumber, { color: theme.brand.primary }]}>{stats.bookmarks}</Text>
            <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>BOOKMARKS</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.statNumber, { color: theme.brand.primary }]}>{stats.likes}</Text>
            <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>LIKES</Text>
          </View>
        </View>

        {/* Content Sections */}
        <View style={styles.sectionsContainer}>
            {/* Personalization Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>PERSONALIZATION</Text>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <MenuItem
                    icon="heart"
                    title="Edit Interests"
                    subtitle="Customize your news feed"
                    onPress={handleEditInterests}
                    />
                    <MenuItem
                    icon="notifications"
                    title="Notifications"
                    subtitle="Manage your alerts"
                    onPress={() => triggerHaptic()}
                    />
                </View>
            </View>

            {/* Appearance Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>APPEARANCE</Text>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <MenuItem
                        icon="moon"
                        title="Theme"
                        subtitle={themeMode === 'light' ? 'Light Mode' : 'Dark Mode'}
                        showChevron={false}
                        rightElement={
                            <View style={[styles.themeToggle, { backgroundColor: theme.border }]}>
                                <TouchableOpacity 
                                    style={[styles.themePill, themeMode === 'light' && { backgroundColor: theme.brand.primary }]}
                                    onPress={() => { triggerHaptic(); setThemeMode('light'); }}
                                >
                                    <Ionicons name="sunny-outline" size={14} color={themeMode === 'light' ? theme.text.inverse : theme.text.tertiary} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.themePill, themeMode === 'dark' && { backgroundColor: theme.brand.primary }]}
                                    onPress={() => { triggerHaptic(); setThemeMode('dark'); }}
                                >
                                    <Ionicons name="moon" size={14} color={themeMode === 'dark' ? theme.text.inverse : theme.text.tertiary} />
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>
            </View>

            {/* Account Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>ACCOUNT</Text>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <MenuItem
                        icon="log-out"
                        title="Logout"
                        subtitle="Sign out of your account"
                        onPress={handleLogout}
                        accentColor="#EF4444"
                    />
                </View>
            </View>
        </View>

        {/* App Footer */}
        <View style={styles.footer}>
            <Text style={[styles.footerVersion, { color: theme.text.muted }]}>dayStart.ai V1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  avatarInitial: {
    fontSize: 50,
    fontFamily: Typography.fonts.primary,
  },
  userName: {
    fontSize: 28,
    fontFamily: Typography.fonts.primary,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  statBox: {
    width: (width - 60) / 3,
    height: 100,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: Typography.fonts.primary,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionsContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
  },
  themeToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
    gap: 4,
  },
  themePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  footerVersion: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  footerCopyright: {
    fontSize: 13,
  },
});
