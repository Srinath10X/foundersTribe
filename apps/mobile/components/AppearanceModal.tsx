import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type ModeOption = "light" | "dark";

const OPTIONS: { key: ModeOption; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    key: "light",
    title: "Light",
    subtitle: "Clean and bright interface",
    icon: "sunny-outline",
  },
  {
    key: "dark",
    title: "Dark",
    subtitle: "Low-glare interface for night",
    icon: "moon-outline",
  },
];

function Radio({ selected, color }: { selected: boolean; color: string }) {
  return (
    <View style={[styles.radioOuter, { borderColor: selected ? color : "rgba(148,163,184,0.55)" }]}>
      {selected ? <View style={[styles.radioInner, { backgroundColor: color }]} /> : null}
    </View>
  );
}

export default function AppearanceModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const activeMode: ModeOption = themeMode === "system" ? (isDark ? "dark" : "light") : themeMode;
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.09)";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)";
  const closeBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor,
              paddingBottom: Math.max(14, insets.bottom + 8),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text.primary }]}>Appearance</Text>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.82}
              style={[styles.closeButton, { borderColor, backgroundColor: closeBg }]}
            >
              <Ionicons name="close" size={17} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.optionsWrap, { borderColor }]}>
            {OPTIONS.map((item, index) => {
              const selected = activeMode === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.88}
                  onPress={() => setThemeMode(item.key)}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: selected ? cardBg : "transparent",
                      borderBottomWidth: index === OPTIONS.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: borderColor,
                    },
                  ]}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconWrap, { borderColor }]}>
                      <Ionicons name={item.icon} size={16} color={selected ? theme.brand.primary : theme.text.secondary} />
                    </View>
                    <View style={styles.textWrap}>
                      <Text style={[styles.optionTitle, { color: theme.text.primary }]}>{item.title}</Text>
                      <Text style={[styles.optionSubtitle, { color: theme.text.secondary }]}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <Radio selected={selected} color={theme.brand.primary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsWrap: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  optionRow: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    lineHeight: 19,
  },
  optionSubtitle: {
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
