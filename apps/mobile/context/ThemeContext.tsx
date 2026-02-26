import { DarkTheme, LightTheme } from '@/constants/DesignSystem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useColorScheme as useDeviceColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';
type Theme = typeof DarkTheme;

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const themeTransitionOpacity = useRef(new Animated.Value(0)).current;
  const [themeTransitionColor, setThemeTransitionColor] = useState<string | null>(null);
  
  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);
  
  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsThemeLoaded(true);
    }
  };

  const runThemeTransition = (fromTheme: Theme) => {
    setThemeTransitionColor(fromTheme.background);
    themeTransitionOpacity.stopAnimation();
    themeTransitionOpacity.setValue(1);
    requestAnimationFrame(() => {
      Animated.timing(themeTransitionOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setThemeTransitionColor(null);
      });
    });
  };
  
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      runThemeTransition(theme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };
  
  // Determine actual theme based on mode and device settings
  const isDark = themeMode === 'system' 
    ? deviceColorScheme === 'dark'
    : themeMode === 'dark';
  
  const theme = isDark ? DarkTheme : LightTheme;

  // Prevent rendering (and thus flashing wrong theme) until we've read storage
  if (!isThemeLoaded) {
    return null; 
  }
  
  const toggleTheme = async () => {
    const newMode = isDark ? 'light' : 'dark';
    await setThemeMode(newMode);
  };
  
  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme, isDark }}>
      <View style={styles.root}>
        {children}
        {themeTransitionColor ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: themeTransitionColor,
                opacity: themeTransitionOpacity,
              },
            ]}
          />
        ) : null}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
