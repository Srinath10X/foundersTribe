import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { ThemedText } from './themed-text';
import { Typography, Spacing, Layout } from '../constants/DesignSystem';

interface CreateRoomModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCreate: (roomName: string, isPublic: boolean) => void;
  isLoading?: boolean;
}

type RoomType = 'public' | 'private';

export default function CreateRoomModal({
  isVisible,
  onClose,
  onCreate,
  isLoading = false,
}: CreateRoomModalProps) {
  const { theme } = useTheme();
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('public');
  const [nameError, setNameError] = useState('');

  const handleTypeSelect = useCallback((type: RoomType) => {
    if (type !== roomType) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRoomType(type);
    }
  }, [roomType]);

  const handleCreatePress = () => {
    const trimmed = roomName.trim();
    if (trimmed === '') {
      setNameError('Give your room a name');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (trimmed.length < 3) {
      setNameError('Name must be at least 3 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setNameError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreate(trimmed, roomType === 'public');
    setRoomName('');
    setRoomType('public');
  };

  const handleClose = () => {
    setRoomName('');
    setRoomType('public');
    setNameError('');
    onClose();
  };

  const handleNameChange = (text: string) => {
    setRoomName(text);
    if (nameError) setNameError('');
  };

  const isPublic = roomType === 'public';

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable style={[styles.modalView, { backgroundColor: theme.surface }]}>
            {/* Header icon */}
            <View style={[styles.headerIcon, { backgroundColor: theme.brand.primary + '15' }]}>
              <Ionicons name="mic-outline" size={28} color={theme.brand.primary} />
            </View>

            {/* Title + Close */}
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={{ color: theme.text.primary, flex: 1 }}>
                Create Voice Room
              </ThemedText>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={isLoading}>
                <Ionicons name="close" size={22} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            {/* Room name input */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Room Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: nameError ? theme.error : theme.border,
                    color: theme.text.primary,
                  },
                ]}
                placeholder="e.g. Startup Founders Hangout"
                placeholderTextColor={theme.text.muted}
                value={roomName}
                onChangeText={handleNameChange}
                editable={!isLoading}
                maxLength={60}
                autoFocus
              />
              {nameError ? (
                <Text style={[styles.errorText, { color: theme.error }]}>{nameError}</Text>
              ) : (
                <Text style={[styles.charCount, { color: theme.text.muted }]}>
                  {roomName.length}/60
                </Text>
              )}
            </View>

            {/* Room type selector */}
            <View style={styles.typeSection}>
              <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Room Type</Text>
              <View style={[styles.typeSelector, { backgroundColor: theme.background }]}>
                {/* Public option */}
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    isPublic && {
                      backgroundColor: theme.success + '18',
                      borderColor: theme.success + '50',
                      borderWidth: 1.5,
                    },
                    !isPublic && {
                      borderColor: 'transparent',
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => handleTypeSelect('public')}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <View style={[styles.typeIconWrap, { backgroundColor: isPublic ? theme.success + '20' : theme.surfaceElevated }]}>
                    <Ionicons
                      name="globe-outline"
                      size={20}
                      color={isPublic ? theme.success : theme.text.tertiary}
                    />
                  </View>
                  <Text style={[
                    styles.typeTitle,
                    { color: isPublic ? theme.text.primary : theme.text.tertiary },
                  ]}>
                    Public
                  </Text>
                  <Text style={[
                    styles.typeDesc,
                    { color: isPublic ? theme.text.secondary : theme.text.muted },
                  ]}>
                    Anyone can join
                  </Text>
                </TouchableOpacity>

                {/* Private option */}
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    !isPublic && {
                      backgroundColor: theme.brand.secondary + '18',
                      borderColor: theme.brand.secondary + '50',
                      borderWidth: 1.5,
                    },
                    isPublic && {
                      borderColor: 'transparent',
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => handleTypeSelect('private')}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <View style={[styles.typeIconWrap, { backgroundColor: !isPublic ? theme.brand.secondary + '20' : theme.surfaceElevated }]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={!isPublic ? theme.brand.secondary : theme.text.tertiary}
                    />
                  </View>
                  <Text style={[
                    styles.typeTitle,
                    { color: !isPublic ? theme.text.primary : theme.text.tertiary },
                  ]}>
                    Private
                  </Text>
                  <Text style={[
                    styles.typeDesc,
                    { color: !isPublic ? theme.text.secondary : theme.text.muted },
                  ]}>
                    Invite only
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Create button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: theme.brand.primary },
                isLoading && styles.createButtonDisabled,
              ]}
              onPress={handleCreatePress}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.createButtonText}>Creating…</Text>
                </View>
              ) : (
                <View style={styles.loadingContainer}>
                  <Ionicons name="mic" size={18} color="white" />
                  <Text style={styles.createButtonText}>Start Room</Text>
                </View>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalView: {
    borderRadius: Layout.radius.xl,
    padding: Spacing.xl,
    width: '88%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.lg,
  },
  closeButton: {
    padding: 6,
    borderRadius: Layout.radius.sm,
  },
  inputSection: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.presets.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1.5,
    borderRadius: Layout.radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sizes.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  errorText: {
    ...Typography.presets.caption,
    marginTop: 4,
  },
  charCount: {
    ...Typography.presets.caption,
    marginTop: 4,
    textAlign: 'right',
  },
  typeSection: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderRadius: Layout.radius.md,
    padding: Spacing.xs,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.radius.md,
  },
  typeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  typeTitle: {
    ...Typography.presets.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  typeDesc: {
    ...Typography.presets.caption,
    textAlign: 'center',
  },
  createButton: {
    width: '100%',
    borderRadius: Layout.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    ...Typography.presets.body,
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
