/**
 * FREELANCER DESIGN TOKENS
 * Premium marketplace-specific tokens extending the base DesignSystem.
 */

import { Platform } from 'react-native';
import { Layout, Spacing } from '@/constants/DesignSystem';

// ─── Spacing Scale (strict 4-pt grid) ──────────────────────────
// ─── Spacing Scale (8-pt aligned where possible) ───────────────
export const SP = {
    _2: 2,
    _4: 4,
    _8: 8,
    _12: 12,
    _16: 16,
    _20: 20,
    _24: 24,
    _32: 32,
    _40: 40,
    _48: 48,
    _64: 64,
} as const;

// ─── Border Radius ─────────────────────────────────────────────
export const RADIUS = {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
} as const;

// ─── Category Colors ───────────────────────────────────────────
export const CATEGORY_COLORS = [
    { color: '#FF7A00', bgLight: 'rgba(255, 122, 0, 0.12)', bgDark: 'rgba(255, 122, 0, 0.18)' },
    { color: '#007AFF', bgLight: 'rgba(0, 122, 255, 0.12)', bgDark: 'rgba(0, 122, 255, 0.18)' },
    { color: '#FF2D55', bgLight: 'rgba(255, 45, 85, 0.12)', bgDark: 'rgba(255, 45, 85, 0.18)' },
    { color: '#34C759', bgLight: 'rgba(52, 199, 89, 0.12)', bgDark: 'rgba(52, 199, 89, 0.18)' },
    { color: '#AF52DE', bgLight: 'rgba(175, 82, 222, 0.12)', bgDark: 'rgba(175, 82, 222, 0.18)' },
    { color: '#FF9500', bgLight: 'rgba(255, 149, 0, 0.12)', bgDark: 'rgba(255, 149, 0, 0.18)' },
] as const;

// ─── Shadows ───────────────────────────────────────────────────
// ─── Shadows (Softer & more modern) ────────────────────────────
export const SHADOWS = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    cardHover: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    search: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
    },
    subtle: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
} as const;

// ─── Typography Helpers ────────────────────────────────────────
const fontFamily = Platform.OS === 'ios' ? 'System' : 'Roboto';

export const TYPO = {
    displayLg: { fontSize: 40, lineHeight: 48, letterSpacing: -1.2, fontWeight: '700' as const, fontFamily },
    displaySm: { fontSize: 28, lineHeight: 36, letterSpacing: -0.6, fontWeight: '700' as const, fontFamily },
    heading: { fontSize: 22, lineHeight: 28, letterSpacing: -0.5, fontWeight: '700' as const, fontFamily },
    title: { fontSize: 18, lineHeight: 24, letterSpacing: -0.3, fontWeight: '600' as const, fontFamily },
    body: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: '400' as const, fontFamily },
    caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: '500' as const, fontFamily },
    label: { fontSize: 11, lineHeight: 14, letterSpacing: 0.8, fontWeight: '600' as const, textTransform: 'uppercase' as const, fontFamily },
    micro: { fontSize: 10, lineHeight: 12, letterSpacing: 0.6, fontWeight: '600' as const, textTransform: 'uppercase' as const, fontFamily },
} as const;

// ─── Layout Constants ──────────────────────────────────────────
export const SCREEN_PADDING = SP._24;
export const CARD_GAP = SP._16;
export const SECTION_GAP = SP._32;

// ─── Animation Constants ──────────────────────────────────────
export const SPRING_CONFIG = {
    press: { damping: 15, stiffness: 300 },
    gentle: { damping: 20, stiffness: 120 },
    snappy: { damping: 18, stiffness: 250 },
} as const;
