import { useTheme } from '@/context/ThemeContext';
import { useArticleInteractions } from '@/hooks/useArticleInteractions';
import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    Share as RNShare,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Article {
  id: number;
  Title: string;
  Content: string | null;
  'Image URL': string | null;
  'Company Name': string | null;
  'Article Link': string | null;
  Category: string | null;
  Summary: string | null;
}

export default function ArticleDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [fontSize, setFontSize] = useState(18); // Started slightly larger for better reading
  const [imageLoading, setImageLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  
  // Animation values
  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);

  // Parse article data from params
  const article = {
    id: parseInt(params.id as string),
    Title: params.title as string,
    Summary: params.summary as string,
    Content: params.content as string,
    'Image URL': params.imageUrl as string,
    'Article Link': params.articleLink as string,
    Category: params.category as string,
    'Company Name': params.companyName as string,
  };

  // Parse history IDs (visited articles in this stack)
  const historyIds = params.historyIds 
    ? (params.historyIds as string).split(',').filter(id => id && !isNaN(Number(id))).map(Number) 
    : [];

  const { liked, bookmarked, toggleLike, toggleBookmark } = useArticleInteractions(article.id);

  useEffect(() => {
    fetchRelatedArticles();
  }, [article.id, article.Category]);

  const fetchRelatedArticles = async () => {
    try {
      const rawCat = article.Category;
      const currentCategory = (rawCat && rawCat !== 'null' && rawCat !== 'undefined') ? rawCat : null;
      const excludeIds = [...historyIds, article.id].filter(id => typeof id === 'number' && !isNaN(id));
      const excludeString = `(${excludeIds.join(',')})`;

      let finalArticles: Article[] = [];

      // 1. Try to fetch same category first
      if (currentCategory) {
        let query = supabase
          .from('Articles')
          .select('*')
          .eq('Category', currentCategory)
          .limit(5);

        if (excludeIds.length > 0) {
          query = query.not('id', 'in', excludeString);
        }

        const { data: sameCategoryData } = await query;
        if (sameCategoryData) {
          finalArticles = sameCategoryData;
        }
      }

      // 2. Fallback if needed
      if (finalArticles.length < 5) {
        const needed = 5 - finalArticles.length;
        let fallbackQuery = supabase
          .from('Articles')
          .select('*')
          .limit(20);

        if (currentCategory) {
           fallbackQuery = fallbackQuery.neq('Category', currentCategory);
        }
        if (excludeIds.length > 0) {
          fallbackQuery = fallbackQuery.not('id', 'in', excludeString);
        }

        const { data: fallbackData } = await fallbackQuery;
        
        if (fallbackData) {
           // Simple dedup logic
           const existingIds = new Set(finalArticles.map(a => a.id));
           const additional = fallbackData.filter(a => !existingIds.has(a.id)).slice(0, needed);
           finalArticles = [...finalArticles, ...additional];
        }
      }

      setRelatedArticles(finalArticles.slice(0, 5));
    } catch (error) {
      console.error('Error fetching related articles:', error);
    }
  };

  const readTime = React.useMemo(() => {
    const text = article.Content || article.Summary || '';
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} MIN READ`;
  }, [article.Content, article.Summary]);

  const likeAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));
  const bookmarkAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: bookmarkScale.value }] }));
  
  // Design Constants
  const accentColor = '#d4af37';

  const handleBack = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleShare = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await RNShare.share({
        message: article['Article Link'] ? `${article.Title}\n\n${article['Article Link']}` : article.Title,
        url: article['Article Link'] || undefined,
      });
    } catch (error) { console.error('Error sharing:', error); }
  };

  const handleLike = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likeScale.value = withSequence(withSpring(1.4), withSpring(1));
    toggleLike();
  };

  const handleBookmark = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bookmarkScale.value = withSequence(withSpring(1.4), withSpring(1));
    toggleBookmark();
  };

  const increaseFontSize = () => { if (fontSize < 32) setFontSize(fontSize + 2); };
  const decreaseFontSize = () => { if (fontSize > 14) setFontSize(fontSize - 2); };

  const handleRelatedArticlePress = (relatedArticle: Article) => {
    const nextHistoryIds = [...historyIds, article.id].join(',');
    router.push({
      pathname: '/article/[id]',
      params: {
        id: relatedArticle.id.toString(),
        title: relatedArticle.Title,
        summary: relatedArticle.Summary || relatedArticle.Content || '',
        content: relatedArticle.Content || relatedArticle.Summary || '',
        imageUrl: relatedArticle['Image URL'] || '',
        articleLink: relatedArticle['Article Link'] || '',
        category: relatedArticle.Category || '',
        companyName: relatedArticle['Company Name'] || '',
        historyIds: nextHistoryIds,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 60 }}
        style={styles.scrollView}
        scrollEventThrottle={16}
      >
          {/* HERO IMAGE SECTION */}
          <View style={styles.heroContainer}>
              <Image
                source={{ uri: article['Image URL'] || 'https://images.unsplash.com/photo-1541560052-5e137f229371' }}
                style={styles.heroImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                onLoadEnd={() => setImageLoading(false)}
              />
              
              {/* Gradient Overlay for seamless text transition */}
              <LinearGradient
                  colors={['transparent', theme.background]}
                  style={styles.heroGradient}
                  start={{ x: 0, y: 0.4 }}
                  end={{ x: 0, y: 1 }}
              />

              {imageLoading && (
                <View style={[styles.loadingSkeleton, { backgroundColor: theme.surface }]}>
                  <ActivityIndicator size="large" color={accentColor} />
                </View>
              )}

              {/* Top Navigation Controls */}
              <View style={[styles.topControls, { top: (Platform.OS === 'ios' ? 50 : 20) + insets.top }]}>
                  <TouchableOpacity style={styles.navButton} onPress={handleBack}>
                      <BlurView intensity={20} tint="dark" style={styles.glassBackground}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                      </BlurView>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.navButton} onPress={handleShare}>
                      <BlurView intensity={20} tint="dark" style={styles.glassBackground}>
                        <Ionicons name="share-outline" size={22} color="#FFF" />
                      </BlurView>
                  </TouchableOpacity>
              </View>
          </View>

          {/* MAIN CONTENT */}
          <View style={styles.contentContainer}>
              {/* Article Header */}
              <View style={styles.articleHeader}>
                  <View style={styles.categoryBadge}>
                       <View style={[styles.categoryDot, { backgroundColor: accentColor }]} />
                       <Text style={[styles.categoryText, { color: accentColor }]}>
                           {article.Category || 'News'}
                       </Text>
                  </View>

                  <Text style={[styles.title, { color: theme.text.primary }]}>
                      {article.Title}
                  </Text>
                  
                  <View style={styles.metaRow}>
                      <Text style={[styles.metaText, { color: theme.text.secondary }]}>
                          {article['Company Name'] ? `${article['Company Name']} • ` : ''}{readTime}
                      </Text>
                  </View>
              </View>

              {/* Action Bar (Like, Bookmark, Font) */}
              <View style={[styles.actionBar, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
                  <View style={styles.actionGroup}>
                      <TouchableOpacity onPress={handleLike} style={styles.actionIcon}>
                          <Animated.View style={likeAnimatedStyle}>
                              <MaterialIcons name={liked ? "favorite" : "favorite-border"} size={24} color={liked ? "#FF3B30" : theme.text.secondary} />
                          </Animated.View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity onPress={handleBookmark} style={styles.actionIcon}>
                          <Animated.View style={bookmarkAnimatedStyle}>
                              <MaterialIcons name={bookmarked ? "bookmark" : "bookmark-border"} size={24} color={bookmarked ? "#FFD700" : theme.text.secondary} />
                          </Animated.View>
                      </TouchableOpacity>
                  </View>

                  <View style={styles.fontControls}>
                       <TouchableOpacity onPress={decreaseFontSize} hitSlop={10}>
                           <Text style={[styles.fontIcon, { fontSize: 16, color: theme.text.secondary }]}>A</Text>
                       </TouchableOpacity>
                       <View style={[styles.fontDivider, { backgroundColor: theme.text.tertiary }]} />
                       <TouchableOpacity onPress={increaseFontSize} hitSlop={10}>
                           <Text style={[styles.fontIcon, { fontSize: 22, color: theme.text.primary }]}>A</Text>
                       </TouchableOpacity>
                  </View>
              </View>

              {/* Body Text */}
              <Text style={[
                  styles.bodyText, 
                  { 
                      fontSize: fontSize, 
                      color: theme.text.secondary,
                      lineHeight: fontSize * 1.6 
                  }
              ]}>
                  {article.Content || article.Summary || "No content available for this article."}
              </Text>

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <View style={styles.relatedConfig}>
                  <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Read Next</Text>
                  </View>
                  
                  {relatedArticles.map((item) => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[styles.relatedCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]} 
                      onPress={() => handleRelatedArticlePress(item)}
                      activeOpacity={0.7}
                    >
                      <Image 
                        source={{ uri: item['Image URL'] || 'https://images.unsplash.com/photo-1541560052-5e137f229371' }}
                        style={styles.relatedImage}
                        contentFit="cover"
                      />
                      <View style={styles.relatedContent}>
                          <Text style={[styles.relatedCategory, { color: accentColor }]}>
                              {item.Category || 'NEWS'}
                          </Text>
                          <Text style={[styles.relatedTitle, { color: theme.text.primary, fontFamily: 'PlayfairDisplay_700Bold' }]} numberOfLines={2}>
                              {item.Title}
                          </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
          </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  
  // HERO SECTION
  heroContainer: {
    width: '100%',
    height: 420, // Taller hero
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200, // Smooth fade transition
  },
  loadingSkeleton: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topControls: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)', // Fallback
  },
  glassBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // CONTENT CONTAINER - Moves up over image slightly or just starts after
  contentContainer: {
    paddingHorizontal: 24,
    marginTop: -80, // Pull up over the gradient
    zIndex: 10,
  },
  
  // HEADER
  articleHeader: {
    marginBottom: 24,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    fontFamily: 'Poppins_600SemiBold',
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ACTION BAR
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 32,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 24,
  },
  actionIcon: {
    padding: 4,
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(128,128,128,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  fontDivider: {
    width: 1,
    height: 12,
    opacity: 0.3,
  },
  fontIcon: {
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },

  // BODY
  bodyText: {
    fontWeight: '400',
    fontFamily: 'Poppins_400Regular', // Or standard serif
    textAlign: 'left',
    marginBottom: 48,
  },

  // RELATED SECTION
  relatedConfig: {
    marginTop: 0,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
  },
  relatedCard: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  relatedImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  relatedContent: {
    flex: 1,
    justifyContent: 'center',
  },
  relatedCategory: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  relatedTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Poppins_700Bold'
  },
});
