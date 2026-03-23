import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemedText } from './themed-text';

interface CreateRoomModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCreate: (roomName: string, isPublic: boolean) => void;
  isLoading?: boolean;
}

export default function CreateRoomModal({
  isVisible,
  onClose,
  onCreate,
  isLoading = false,
}: CreateRoomModalProps) {
  const { theme } = useTheme(); // Use theme for colors
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const handleCreatePress = () => {
    if (roomName.trim() === '') {
      Alert.alert('Error', 'Room name cannot be empty.');
      return;
    }
    onCreate(roomName, isPublic);
    setRoomName('');
    setIsPublic(true);
  };

  return (
    <Modal
      animationType="fade" // Use fade for a smoother transition
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={{ color: theme.text.primary }}>Create New Room</ThemedText>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isLoading}>
                <Ionicons name="close" size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text.primary,
              }]}
              placeholder="Room Name"
              placeholderTextColor={theme.text.muted}
              value={roomName}
              onChangeText={setRoomName}
              editable={!isLoading}
            />

            <View style={styles.switchContainer}>
              <ThemedText style={{ color: theme.text.primary }}>Public Room</ThemedText>
              <Switch
                onValueChange={setIsPublic}
                value={isPublic}
                trackColor={{ false: theme.text.muted, true: theme.brand.primary }}
                thumbColor={Platform.OS === 'android' ? theme.background : ''} // Android thumb color
                disabled={isLoading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.createButton, 
                { backgroundColor: theme.brand.primary },
                isLoading && styles.createButtonDisabled
              ]}
              onPress={handleCreatePress}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" size="small" />
                  <ThemedText type="defaultSemiBold" style={styles.createButtonText}>Creating...</ThemedText>
                </View>
              ) : (
                <ThemedText type="defaultSemiBold" style={styles.createButtonText}>Create Room</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay
  },
  modalView: {
    margin: 20,
    borderRadius: 15, // Softer corners
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4, // More pronounced shadow
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    width: '85%', // Slightly wider
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 30,
  },
  switchLabel: {
    fontSize: 16,
  },
  createButton: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 30,
    elevation: 2,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: 'white', // Text color for buttons is usually white
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});