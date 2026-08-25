import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/appStyles';

export default function Toast({ message }) {
  if (!message) return null;

  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText}>✨ {message}</Text>
    </View>
  );
}
