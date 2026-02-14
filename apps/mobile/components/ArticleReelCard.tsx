import { Layout } from '@/constants/DesignSystem';
import { useTheme } from '@/context/ThemeContext';
import { useArticleInteractions } from '@/hooks/useArticleInteractions';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, Share, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 70;

// Layout Constants
const REEL_WIDTH = Platform.OS === 'web' ? Math.min(windowWidth, Layout.webMaxWidth) : windowWidth;
const REEL_HEIGHT = Platform.OS === 'web' 
  ? Math.min(windowHeight, Layout.webMaxHeight) 
  : windowHeight - TAB_BAR_HEIGHT;

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

interface ArticleReelCardProps {
  article: Article;
}

export function ArticleReelCard({ article }: ArticleReelCardProps) {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { liked, bookmarked, toggleLike, toggleBookmark } = useArticleInteractions(article.id);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Animation values
  // -- Animations --
  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
  
  // -- Memoized Utilities --
  const readTime = useMemo(() => {
    const text = article.Content || article.Summary || '';
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200); // 200 wpm
    return `${minutes} min read`;
  }, [article.Content, article.Summary]);

  // -- Interaction Handlers --
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleOpenArticle = () => {
    triggerHaptic();
    router.push({
      pathname: '/article/[id]',
      params: {
        id: article.id.toString(),
        title: article.Title,
        summary: article.Summary || article.Content || '',
        content: article.Content || article.Summary || '',
        imageUrl: article['Image URL'] || '',
        articleLink: article['Article Link'] || '',
        category: article.Category || '',
        companyName: article['Company Name'] || '',
      },
    });
  };

  const handleShare = async () => {
    triggerHaptic();
    // Bouncy animation
    shareScale.value = withSequence(
      withSpring(1.3, { damping: 8 }),
      withSpring(1, { damping: 8 })
    );
    try {
      const shareUrl = article['Article Link'];
      await Share.share({
        message: shareUrl ? `${article.Title}\n\n${shareUrl}` : `${article.Title}\n\nRead more on foundersTribe`,
        url: shareUrl || undefined,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleLike = () => {
    triggerHaptic();
    // Heartbeat animation
    likeScale.value = withSequence(withSpring(1.4), withSpring(1));
    try { toggleLike(); } catch (e) { console.error(e); }
  };

  const handleBookmark = () => {
    triggerHaptic();
    // Bookmark fill animation
    bookmarkScale.value = withSequence(withSpring(1.4), withSpring(1));
    try { toggleBookmark(); } catch (e) { console.error(e); }
  };

  const likeAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));
  const bookmarkAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: bookmarkScale.value }] }));
  const shareAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: shareScale.value }] }));
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 1. Full Screen Visual Layer */}
      <View style={styles.cardVisual}>
        <Image
          source={{ uri: article['Image URL'] || 'https://images.unsplash.com/photo-1541560052-5e137f229371' }}
          style={styles.visualImg}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
          onLoadEnd={() => setImageLoading(false)}
        />
        {/* Scrim Gradient for Readability */}
        <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
            style={styles.imageOverlay}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 0, y: 1 }}
        />
      </View>

      {imageLoading && (
        <View style={[styles.loadingSkeleton, { backgroundColor: theme.surface }]}>
          <ActivityIndicator size="large" color={'#D4AF37'} />
        </View>
      )}

      {/* 2. Main Content & Interaction Layer */}
      <View style={[styles.contentWrapper, { paddingBottom: Platform.OS === 'ios' ? 90 : 30 }]}>
        
        <View style={styles.columnContainer}>
            {/* Left Column: Text Content */}
            <View style={styles.leftColumn}>
                
                {/* Category Pill */}
                <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>
                        {article.Category || 'NEWS'}
                    </Text>
                </View>

                {/* Title */}
                <TouchableOpacity activeOpacity={0.9} onPress={handleOpenArticle}>
                    <Text style={styles.cardTitle} numberOfLines={3}>
                        {article.Title}
                    </Text>
                </TouchableOpacity>
                
                {/* Summary with 'more' */}
                <TouchableOpacity activeOpacity={0.9} onPress={handleOpenArticle}>
                    <Text style={styles.cardSummary} numberOfLines={2}>
                        {article.Summary || article.Content}
                        <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}> ... more</Text>
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Right Column: Vertical Actions */}
            <View style={styles.rightColumn}>
                
                {/* Like */}
                <View style={styles.actionItem}>
                    <TouchableOpacity onPress={handleLike} style={styles.iconBtn}>
                        <Animated.View style={likeAnimatedStyle}>
                           <MaterialIcons name={liked ? "favorite" : "favorite"} size={32} color={liked ? "#FF3B30" : "#FFFFFF"} />
                        </Animated.View>
                    </TouchableOpacity>
                    <Text style={styles.actionLabel}>Like</Text>
                </View>

                {/* Save */}
                <View style={styles.actionItem}>
                    <TouchableOpacity onPress={handleBookmark} style={styles.iconBtn}>
                        <Animated.View style={bookmarkAnimatedStyle}>
                            <MaterialIcons name={bookmarked ? "bookmark" : "bookmark"} size={32} color={bookmarked ? "#D4AF37" : "#FFFFFF"} />
                        </Animated.View>
                    </TouchableOpacity>
                    <Text style={styles.actionLabel}>Saved</Text>
                </View>

                {/* Share */}
                <View style={styles.actionItem}>
                    <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                        <Animated.View style={shareAnimatedStyle}>
                            <MaterialIcons name="share" size={32} color="#FFFFFF" />
                        </Animated.View>
                    </TouchableOpacity>
                    <Text style={styles.actionLabel}>Share</Text>
                </View>

            </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  
  // VISUAL LAYER
  cardVisual: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  visualImg: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  loadingSkeleton: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },

  // CONTENT OVERLAY
  contentWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    zIndex: 10,
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
  },
  columnContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },

  // LEFT COLUMN
  leftColumn: {
    flex: 1,
    paddingRight: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    backgroundColor: '#D4AF37', // Brand Gold
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 22, // Large readable title
    lineHeight: 28,
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Poppins_400Regular',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // RIGHT COLUMN
  rightColumn: {
    width: 60,
    alignItems: 'center',
    gap: 24, // Space between action groups
    paddingBottom: 16,
  },
  actionItem: {
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    // No background, just icon like Reels
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
