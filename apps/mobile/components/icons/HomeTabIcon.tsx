import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

type HomeTabIconProps = {
  color: string;
  size?: number;
  focused?: boolean;
};

export default function HomeTabIcon({ color, size = 20, focused = false }: HomeTabIconProps) {
  return (
    <Svg width={size + 3} height={size + 3} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.75 10.35L10.83 4.94C11.5 4.35 12.5 4.35 13.17 4.94L19.25 10.35V17.65C19.25 18.76 18.36 19.65 17.25 19.65H6.75C5.64 19.65 4.75 18.76 4.75 17.65V10.35Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="10.15"
        y="13.15"
        width="3.7"
        height="6.5"
        rx="0.85"
        fill={focused ? color : "transparent"}
        stroke={color}
        strokeWidth={1.4}
      />
    </Svg>
  );
}
