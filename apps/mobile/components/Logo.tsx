import React from "react";
import { Image } from "expo-image";
import { useTheme } from "@/context/ThemeContext";

interface LogoProps {
  width?: number;
  height?: number;
  color?: string;
}

export const Logo = ({ width = 90, height = 90 }: LogoProps) => {
  const { isDark } = useTheme();

  return (
    <Image
      source={
        isDark
          ? require("@/assets/images/logo-dark.png")
          : require("@/assets/images/logo-light.png")
      }
      style={{ width, height }}
      contentFit="contain"
    />
  );
};
