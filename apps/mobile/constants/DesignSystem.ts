/**
 * PREMIUM DESIGN SYSTEM
 * Best-in-class social news app design foundation
 * Supports Light & Dark modes with consistent premium feel
 */

import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ────────────────────────────────────────────────────────
// PREMIUM COLOR PALETTE
// Calm, refined, editorial aesthetic for long reading sessions
// ────────────────────────────────────────────────────────

/**
 * Dark Theme Palette
 * Deep charcoal backgrounds with gold accents for a premium feel.
 * Optimized for OLED screens and low-light reading.
 */
export const DarkTheme = {
    // Base - Deep charcoal, not pure black
    background: '#0A0A0B',
    surface: '#151517',
    surfaceElevated: '#1E1E21',

    // Brand - Warm bronze/champagne gold (sophisticated, calm)
    brand: {
        primary: '#D4AF37',      // Metallic Gold - main accent
        secondary: '#74A5D4',    // Muted blue
        tertiary: '#D47A74',     // Muted coral
    },

    // Text - Off-white for comfort, refined grays
    text: {
        primary: '#F5F5F7',      // Off-white for main content
        secondary: '#A8A8AD',    // Medium gray for supporting text
        tertiary: '#6E6E73',     // Muted gray for metadata
        muted: '#48484D',        // Very subtle text
        inverse: '#0A0A0B',      // For light backgrounds
    },

    // UI Elements
    border: '#2C2C2E',           // Subtle dividers
    borderLight: '#3A3A3C',      // Slightly more visible
    overlay: 'rgba(10, 10, 11, 0.92)',

    // Semantic - Muted, calm tones
    success: '#6EBF8B',
    warning: '#D4A574',          // Uses accent color
    error: '#D47A74',
    info: '#74A5D4',
};

export const LightTheme = {
    // Base - Warm off-white, pure white cards
    background: '#FAFAF9',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',

    // Brand - Deeper bronze for better contrast on light
    brand: {
        primary: '#D4AF37',      // Metallic Gold
        secondary: '#6091C7',    // Deeper muted blue
        tertiary: '#C76860',     // Deeper muted coral
    },

    // Text - Near-black, balanced grays
    text: {
        primary: '#1A1A1B',      // Near-black for main content
        secondary: '#5E5E62',    // Medium gray
        tertiary: '#8E8E93',     // Light gray for metadata
        muted: '#C7C7CC',        // Very light gray
        inverse: '#FAFAF9',      // For dark backgrounds
    },

    // UI Elements
    border: '#E5E5E7',           // Subtle dividers
    borderLight: '#F2F2F7',      // Very light borders
    overlay: 'rgba(26, 26, 27, 0.5)',

    // Semantic - Deeper muted tones
    success: '#5FA876',
    warning: '#B8935E',          // Uses accent color
    error: '#C76860',
    info: '#6091C7',
};

// Default to dark theme (will be replaced with theme context)
export const Colors = DarkTheme;

// ────────────────────────────────────────────────────────
// PREMIUM TYPOGRAPHY SYSTEM
// Modern sans-serif, editorial hierarchy, optimized for reading
// ────────────────────────────────────────────────────────

import { Platform } from 'react-native';

export const Typography = {
    // Font Families
    fonts: {
        // Primary: Clean, modern sans-serif for all content
        primary: 'Poppins_400Regular',
        // System fonts ensure perfect rendering and consistency
    },

    // Font Sizes (optimized for news content)
    sizes: {
        display: 40,    // Hero headlines
        xxxl: 28,       // Primary headlines
        xxl: 22,        // Secondary headlines
        xl: 18,         // Tertiary headlines
        lg: 17,         // Body large
        md: 15,         // Standard body
        sm: 13,         // Small body
        xs: 12,         // Captions
        xxs: 11,        // Labels
    },

    // Font Weights
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },

    // Line Heights (absolute values for precision)
    lineHeights: {
        display: 48,
        xxxl: 36,
        xxl: 30,
        xl: 26,
        lg: 28,
        md: 24,
        sm: 20,
        xs: 16,
        xxs: 14,
    },

    // Letter Spacing
    letterSpacing: {
        tight: -0.6,
        normal: -0.4,
        slight: -0.2,
        none: 0,
        wide: 0.2,
        wider: 0.8,
    },

    // Preset Styles (ready-to-use combinations)
    presets: {
        // Display - Hero headlines, landing pages
        display: {
            fontSize: 40,
            fontWeight: '700' as const,
            lineHeight: 48,
            letterSpacing: -0.6,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },

        // H1 - Primary headlines, article titles
        h1: {
            fontSize: 28,
            fontWeight: '700' as const,
            lineHeight: 36,
            letterSpacing: -0.4,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },

        // H2 - Secondary headlines, section titles
        h2: {
            fontSize: 22,
            fontWeight: '600' as const,
            lineHeight: 30,
            letterSpacing: -0.2,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },

        // H3 - Tertiary headlines, subsections
        h3: {
            fontSize: 18,
            fontWeight: '600' as const,
            lineHeight: 26,
            letterSpacing: 0,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },

        // Body Large - Article body, important content
        bodyLarge: {
            fontSize: 17,
            fontWeight: '400' as const,
            lineHeight: 28,
            letterSpacing: 0,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },

        // Body - Standard UI text, descriptions
        body: {
            fontSize: 15,
            fontWeight: '400' as const,
            lineHeight: 24,
            letterSpacing: 0,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },

        // Body Small - Supporting text, captions
        bodySmall: {
            fontSize: 13,
            fontWeight: '400' as const,
            lineHeight: 20,
            letterSpacing: 0,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },

        // Caption - Metadata, timestamps
        caption: {
            fontSize: 12,
            fontWeight: '500' as const,
            lineHeight: 16,
            letterSpacing: 0.2,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },

        // Label - Category tags, uppercase labels
        label: {
            fontSize: 11,
            fontWeight: '600' as const,
            lineHeight: 14,
            letterSpacing: 0.8,
            textTransform: 'uppercase' as const,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },
    },
};

// Backward compatibility
export const Type = {
    ...Typography.presets,
    sizes: Typography.sizes,
    weights: Typography.weights,
    // Legacy presets
    hero: Typography.presets.display,
    title: Typography.presets.h1,
    subtitle: Typography.presets.h3,
    label: Typography.presets.label,
};

// ────────────────────────────────────────────────────────
// REFINED SPACING SYSTEM
// ────────────────────────────────────────────────────────

export const Spacing = {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
    xxxxl: 48,
    xxxxxl: 64,
};

// ────────────────────────────────────────────────────────
// LAYOUT & DIMENSIONS
// ────────────────────────────────────────────────────────

export const Layout = {
    window: { width, height },

    // Web Container
    webMaxWidth: 480,
    webMaxHeight: 920,

    // Border Radius
    radius: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
        full: 9999,
    },

    // Shadows
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
        },
        xl: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
        },
    },
};

// ────────────────────────────────────────────────────────
// ANIMATION TIMINGS
// ────────────────────────────────────────────────────────

export const Animation = {
    // Durations (ms)
    duration: {
        instant: 100,
        fast: 200,
        normal: 300,
        slow: 500,
        slower: 700,
    },

    // Easing
    easing: {
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
        spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },

    // Spring configs (for react-native-reanimated)
    spring: {
        gentle: { damping: 20, stiffness: 90 },
        default: { damping: 15, stiffness: 150 },
        bouncy: { damping: 10, stiffness: 100 },
        snappy: { damping: 18, stiffness: 250 },
    },
};

// ────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────

export default {
    Colors,
    DarkTheme,
    LightTheme,
    Typography,
    Type,
    Spacing,
    Layout,
    Animation,
};
