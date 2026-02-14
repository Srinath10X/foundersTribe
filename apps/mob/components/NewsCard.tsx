import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

interface NewsCardProps {
  image: string;
  category: string;
  title: string;
  source: string;
  time: string;
  isFeatured?: boolean;
}

export function NewsCard({ image, category, title, source, time, isFeatured = false }: NewsCardProps) {
  return (
    <View style={[styles.container, isFeatured && styles.featuredContainer]}>
      <Image source={{ uri: image }} style={styles.image} contentFit="cover" transition={1000} />
      
      <LinearGradient
        colors={['transparent', 'rgba(2, 6, 23, 0.8)', Colors.background]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.badgeContainer}>
             <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{category}</Text>
             </View>
          </View>
          
          <Text style={[styles.title, isFeatured && styles.featuredTitle]} numberOfLines={isFeatured ? 3 : 2}>
            {title}
          </Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.sourceContainer}>
               <Image 
                 source={{ uri: 'https://ui-avatars.com/api/?name=' + source + '&background=random' }} 
                 style={styles.sourceIcon} 
               />
               <Text style={styles.sourceText}>{source}</Text>
            </View>
            <View style={styles.dot} />
            <Text style={styles.timeText}>{time}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    width: width * 0.75, // Horizontal card default
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featuredContainer: {
    width: '100%',
    height: 380,
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  content: {
    gap: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  categoryBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    lineHeight: 26,
    // @ts-ignore - textShadow is supported on Web and in recent RN versions but may not be in current types
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  },
  featuredTitle: {
    fontSize: 24,
    lineHeight: 32,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  sourceText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
    marginHorizontal: 8,
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 13,
  },
} as any);
