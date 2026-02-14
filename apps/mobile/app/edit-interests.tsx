import { Colors, Spacing, Type } from '@/constants/DesignSystem';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function EditInterests() {
  const router = useRouter();
  const { user, refreshOnboardingStatus } = useAuth();
  const { theme, isDark } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; label: string; image: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchCategories(), fetchUserInterests()]);
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('Articles')
        .select('Category, "Image URL"')
        .not('Category', 'is', null)
        .order('Category');

      if (error) throw error;

      if (data) {
        const categoryMap = new Map<string, string>();
        data.forEach(item => {
          if (item.Category && !categoryMap.has(item.Category)) {
            if (item['Image URL']) {
              categoryMap.set(item.Category, item['Image URL']);
            }
          }
        });

        const fetchedCats = Array.from(categoryMap.entries()).map(([cat, img]) => ({
          id: cat.toLowerCase().replace(/ /g, '_'),
          label: cat,
          image: img || 'https://images.unsplash.com/photo-1557683311-eac922347aa1'
        }));

        setCategories(fetchedCats);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchUserInterests = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_interests')
        .select('category')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        // Normalize the categories from DB to match internal IDs for UI checks
        const interests = data.map(item => item.category.toLowerCase().replace(/ /g, '_'));
        console.log('Fetched normalized interests:', interests);
        setSelected(interests);
      }
    } catch (e) {
      console.error('Error fetching user interests:', e);
    }
  };

  const toggleInterest = (id: string) => {
    const normalizedId = id.toLowerCase().replace(/ /g, '_');
    console.log('Toggling:', normalizedId, 'Current selected:', selected);
    
    if (selected.includes(normalizedId)) {
      setSelected(prev => prev.filter((i) => i !== normalizedId));
    } else {
      setSelected(prev => [...prev, normalizedId]);
    }
  };

  const isSelected = (id: string) => {
    const normalizedId = id.toLowerCase().replace(/ /g, '_');
    return selected.includes(normalizedId);
  };

  const handleSave = async () => {
    if (!user || selected.length < 3) return;

    setSaving(true);

    try {
      const interestsData = selected.map(catId => {
        const cat = categories.find(c => c.id === catId);
        return {
          user_id: user.id,
          category: cat ? cat.label : catId
        };
      });

      const deleteResult = await supabase.from('user_interests').delete().eq('user_id', user.id);
      if (deleteResult.error) {
        console.error('DEBUG: Error deleting interests:', deleteResult.error);
        throw deleteResult.error;
      }

      const insertResult = await supabase.from('user_interests').insert(interestsData);
      if (insertResult.error) {
        console.error('DEBUG: Error inserting interests:', insertResult.error);
        throw insertResult.error;
      }

      console.log('DEBUG: Interests updated successfully');
      await refreshOnboardingStatus();
      router.back();
    } catch (error: any) {
      console.error('Error saving interests:', error);
      
      // Check for RLS/permission issues
      if (error?.code === 'PGRST301' || error?.status === 403) {
         alert('Permission denied. Please check your connection and try again.');
      } else {
         alert(`Failed to save: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Edit Interests</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, { color: theme.text.primary }]}>Personalize your feed</Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            Select at least <Text style={{ color: theme.text.primary, fontWeight: '700' }}>3 categories</Text> to customize your news experience.
          </Text>
          <Text style={[styles.currentCount, { color: theme.text.secondary }]}>
            Currently selected: <Text style={{ color: theme.brand.primary, fontWeight: '700' }}>{selected.length}</Text>
          </Text>
        </View>

        {/* Categories Grid */}
        {categories.length > 0 && (
          <View style={styles.gridContainer}>
            {categories.map((item) => {
              const active = isSelected(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.card,
                    { backgroundColor: theme.surface },
                    active && { borderColor: theme.brand.primary }
                  ]}
                  onPress={() => toggleInterest(item.id)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    style={styles.cardGradient}
                  />

                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                  </View>

                  {active && (
                    <View style={styles.checkIcon}>
                      <Ionicons name="checkmark-circle" size={24} color="white" />
                    </View>
                  )}
                  {active && <View style={styles.activeOverlay} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* Footer Action */}
      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.surface }]}>
        <TouchableOpacity
          style={[
            styles.saveBtn, 
            { backgroundColor: theme.brand.primary },
            selected.length < 3 && { backgroundColor: theme.border, opacity: 0.5 }
          ]}
          onPress={handleSave}
          disabled={selected.length < 3 || saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.saveText}>Save Changes</Text>
              <Ionicons name="checkmark" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.countText, { color: theme.text.tertiary }]}>{selected.length} of 3+ selected</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    ...Type.body,
    fontWeight: '700',
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 140,
  },
  titleSection: {
    marginBottom: Spacing.xl,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  currentCount: {
    fontSize: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  card: {
    width: '48%',
    aspectRatio: 1.4,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  cardActive: {
    borderColor: Colors.brand.primary,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
  },
  cardContent: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
  },
  cardLabel: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  saveBtnDisabled: {
    backgroundColor: Colors.borderLight,
    opacity: 0.5,
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  countText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
