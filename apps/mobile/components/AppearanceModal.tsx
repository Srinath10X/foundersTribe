import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type ThemeOption = {
  mode: "system" | "light" | "dark";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

const OPTIONS: ThemeOption[] = [
  {
    mode: "system",
    label: "System",
    icon: "phone-portrait-outline",
    description: "Match device setting",
  },
  {
    mode: "light",
    label: "Light",
    icon: "sunny-outline",
    description: "Always light mode",
  },
  {
    mode: "dark",
    label: "Dark",
    icon: "moon-outline",
    description: "Always dark mode",
  },
];

export default function AppearanceModal({ visible, onClose }: Props) {
  const { theme, themeMode, setThemeMode } = useTheme();

  const handleSelect = (mode: "system" | "light" | "dark") => {
    setThemeMode(mode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleRow}>
          <View
            style={[styles.handle, { backgroundColor: theme.subText + "40" }]}
          />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>Appearance</Text>

        {/* Options */}
        <View style={styles.optionsList}>
          {OPTIONS.map((opt) => {
            const isSelected = themeMode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                activeOpacity={0.7}
                style={[
                  styles.optionRow,
                  {
                    borderColor: isSelected ? "#E23744" : theme.border,
                    backgroundColor: isSelected
                      ? "rgba(226, 55, 68, 0.08)"
                      : "transparent",
                  },
                ]}
                onPress={() => handleSelect(opt.mode)}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={isSelected ? "#E23744" : theme.subText}
                  style={styles.optionIcon}
                />

                <View style={styles.optionTextWrap}>
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: isSelected ? "#E23744" : theme.text,
                        fontWeight: isSelected ? "600" : "400",
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[styles.optionDesc, { color: theme.subText }]}
                  >
                    {opt.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isSelected ? "#E23744" : theme.subText + "60",
                    },
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cancel */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.cancelBtn, { borderColor: theme.border }]}
          onPress={onClose}
        >
          <Text style={[styles.cancelText, { color: theme.subText }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 18,
    marginTop: 4,
  },
  optionsList: {
    gap: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E23744",
  },
  cancelBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
