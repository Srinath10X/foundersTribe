import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

interface LogoProps {
  width?: number;
  height?: number;
  color?: string;
}

/**
 * Shared SVG Logo Component
 * Uses react-native-svg for resolution-independent rendering
 * @param width - defaults to 90
 * @param height - defaults to 90
 * @param color - defaults to #D4AF37 (Gold)
 */
export const Logo = ({ width = 90, height = 90, color = "#D4AF37" }: LogoProps) => (
  <Svg width={width} height={height} viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="16" stroke={color} strokeWidth="2.5" />
    <Circle cx="50" cy="50" r="12" stroke={color} strokeDasharray="2 2" strokeWidth="1.5" />
    <G stroke={color} strokeLinecap="round" strokeWidth="2.5">
        <Path d="M50 20V12" />
        <Path d="M50 88V80" />
        <Path d="M20 50H12" />
        <Path d="M88 50H80" />
        <Path d="M28.8 28.8L23.1 23.1" />
        <Path d="M76.9 76.9L71.2 71.2" />
        <Path d="M28.8 71.2L23.1 76.9" />
        <Path d="M76.9 23.1L71.2 28.8" />
        <Path d="M40 25C43 23 47 22 50 22C53 22 57 23 60 25" strokeWidth="1.5" />
        <Path d="M75 40C77 43 78 47 78 50C78 53 77 57 75 60" strokeWidth="1.5" />
        <Path d="M60 75C57 77 53 78 50 78C47 78 43 77 40 75" strokeWidth="1.5" />
        <Path d="M25 60C23 57 22 53 22 50C22 47 23 43 25 40" strokeWidth="1.5" />
    </G>
  </Svg>
);
