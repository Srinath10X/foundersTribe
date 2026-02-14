import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface CategoryPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function CategoryPill({ label, isActive, onPress, style }: CategoryPillProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.container, style]}>
      {isActive ? (
        <LinearGradient
          colors={['#2563eb', '#1d4ed8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={[styles.text, styles.textActive]}>{label}</Text>
        </LinearGradient>
      ) : (
        <ViewStyleWrapper style={styles.inactiveBackground}>
            <Text style={styles.text}>{label}</Text>
        </ViewStyleWrapper>
      )}
    </TouchableOpacity>
  );
}

// Helper to handle conditional rendering for non-gradient background
const ViewStyleWrapper = ({ children, style }: { children: React.ReactNode; style: any }) => (
    <React.Fragment>
        {/* We use a simple view logic implicitly, but since we needed a wrapper for consistent structure */}
        <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)']}
            style={style}
        >
        {children}
        </LinearGradient>
    </React.Fragment>
);


const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 10,
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveBackground: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, // Ensure inner gradient matches
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  textActive: {
    color: 'white',
  },
});
