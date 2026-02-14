import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function LoginCallback() {
  // This page catches the deep link redirect.
  // The root _layout.tsx will see the session update and redirect to /home.
  // If for some reason it doesn't, we can fall back to login.
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}
