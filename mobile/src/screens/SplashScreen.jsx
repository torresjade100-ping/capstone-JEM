import React from 'react';
import { View, Text, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { styles } from '../styles/appStyles';

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.splashContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0d131f" />
      <View style={styles.splashOrbTop} />
      <View style={styles.splashOrbBottom} />

      <View style={styles.splashCenter}>
        <View style={styles.splashLogoBox}>
          <Text style={styles.splashLogoText}>JEM</Text>
        </View>
        <Text style={styles.splashTitle}>JEM Hardware</Text>
        <Text style={styles.splashSubtitle}>& Construction Supply</Text>
        <Text style={styles.splashTagline}>
          Your trusted partner for all{'\n'}construction and hardware needs
        </Text>
      </View>

      <View style={styles.splashFooter}>
        <ActivityIndicator size="small" color="#f97316" />
        <Text style={styles.splashLoadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}
