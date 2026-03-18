import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
};

export default function DeleteAccountModal({ visible, onClose, onDelete }: Props) {
  const { theme, isDark } = useTheme();
  const [deleting, setDeleting] = useState(false);

  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.09)";
  const closeBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={deleting ? undefined : onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text.primary }]}>Delete Account</Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={deleting}
              activeOpacity={0.82}
              style={[styles.closeButton, { borderColor, backgroundColor: closeBg }]}
            >
              <Ionicons name="close" size={17} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.warningBox, { borderColor }]}>
            <View style={styles.warningIconWrap}>
              <Ionicons name="warning-outline" size={22} color="#EF4444" />
            </View>
            <Text style={[styles.warningText, { color: theme.text.secondary }]}>
              Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              disabled={deleting}
              style={[styles.btn, styles.cancelBtn, { borderColor }]}
            >
              <Text style={[styles.btnText, { color: theme.text.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleDelete}
              disabled={deleting}
              style={[styles.btn, styles.deleteBtn]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.btnText, { color: "#fff" }]}>Delete Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    marginHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    width: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
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
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 18,
  },
  warningIconWrap: {
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    borderWidth: 1,
  },
  deleteBtn: {
    backgroundColor: "#EF4444",
  },
  btnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
});
